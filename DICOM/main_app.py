import sys
import os
import subprocess
import tempfile
import shutil
import torch # 追加
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QLineEdit, QProgressBar, QTextEdit,
    QFileDialog, QMessageBox, QRadioButton, QGroupBox, QListWidget # QListWidget 追加
)
from PySide6.QtCore import Qt, QThread, Signal, QTimer # QTimer 追加

# nifti_to_stl.pyから関数をインポート
from nifti_to_stl import nifti_to_stl

# Simplified layout additions for clarity (クラスの外に移動)
def addWidgets(layout, *widgets): [layout.addWidget(w) for w in widgets]
QHBoxLayout.addWidgets = addWidgets
QVBoxLayout.addWidgets = addWidgets

# --- バックグラウンド処理用のワーカースレッド ---
class ConversionWorker(QThread):
    log_updated = Signal(str)
    progress_updated = Signal(int)
    finished = Signal(str, str) # ステータス ('success', 'error', 'cancelled'), メッセージ
    nnunet_predict_started = Signal() # 追加
    nnunet_predict_finished = Signal() # 追加

    def __init__(self, input_dirs, output_dir, device): # input_dirs をリストに変更
        super().__init__()
        self.input_dirs = input_dirs # リストとして保持
        self.output_dir = output_dir
        self.device = device
        self.is_running = True
        self.total_cases = len(input_dirs)
        self.current_case_index = 0

    def run(self):
        try:
            # ここからインデントを修正
            for i, input_dir in enumerate(self.input_dirs): # 各DICOMフォルダをループ
                if not self.is_running: break # 中止されたらループを抜ける
                self.current_case_index = i
                dicom_folder_name = os.path.basename(input_dir)
                case_output_dir = os.path.join(self.output_dir, dicom_folder_name + "_stl")
                os.makedirs(case_output_dir, exist_ok=True)

                self.log_updated.emit(f"\n--- 患者データ: {dicom_folder_name} の処理を開始... ---")

                # 一時ディレクトリを作成して、中間ファイルを保存
                with tempfile.TemporaryDirectory() as temp_dir:
                    if not self.is_running: break
                    input_nifti_dir = os.path.join(temp_dir, "input_nifti")
                    output_segmentation_dir = os.path.join(temp_dir, "output_segmentation")
                    os.makedirs(input_nifti_dir, exist_ok=True)
                    os.makedirs(output_segmentation_dir, exist_ok=True)

                    # 各ステップの進捗計算
                    base_progress = (self.current_case_index / self.total_cases) * 100
                    step_progress_unit = (100 / self.total_cases) / 3 # 3ステップ (dcm2niix, nnunet, stl)

                    # --- ステップ1: DICOMからNIfTIへの変換 ---
                    self.log_updated.emit("--- ステップ1: DICOMからNIfTIへの変換を開始... ---")
                    cmd1 = ["dcm2niix", "-o", input_nifti_dir, "-z", "y", input_dir]
                    self.run_command(cmd1)
                    if not self.is_running: break
                    self.progress_updated.emit(int(base_progress + step_progress_unit * 1))
                    self.log_updated.emit("--- ステップ1: 完了 ---")

                    # --- ファイル名をnnU-Net用にリネーム ---
                    self.log_updated.emit("--- nnU-Net用のファイル名を準備... ---")
                    nifti_files = [f for f in os.listdir(input_nifti_dir) if f.endswith('.nii.gz')]
                    if len(nifti_files) != 1:
                        raise RuntimeError(f"dcm2niixによって生成されたNIfTIファイルが1つではありません。({len(nifti_files)}個検出)")
                    
                    original_nifti_path = os.path.join(input_nifti_dir, nifti_files[0])
                    renamed_nifti_path = os.path.join(input_nifti_dir, "case_0000.nii.gz")
                    os.rename(original_nifti_path, renamed_nifti_path)
                    self.log_updated.emit(f"ファイルをリネームしました: {nifti_files[0]} -> case_0000.nii.gz")
                    self.progress_updated.emit(int(base_progress + step_progress_unit * 1.33))

                    # --- ステップ2: AIモデルによるセグメンテーション ---
                    if not self.is_running: break
                    self.log_updated.emit("--- ステップ2: AIモデルによるセグメンテーションを開始... ---")
                    
                    if getattr(sys, 'frozen', False):
                        # PyInstallerでフリーズされている場合、同梱されたファイルのパスはsys._MEIPASS
                        base_app_dir = sys._MEIPASS
                    else:
                        # 通常のPython実行の場合
                        base_app_dir = os.path.abspath(".")
                    raw_dir = os.path.join(base_app_dir, "nnUNet_raw")
                    preprocessed_dir = os.path.join(base_app_dir, "nnUNet_preprocessed")
                    results_dir = os.path.join(base_app_dir, "nnUNet_results")
                    
                    os.makedirs(raw_dir, exist_ok=True)
                    os.makedirs(preprocessed_dir, exist_ok=True)
                    
                    os.environ['nnUNet_raw'] = raw_dir
                    os.environ['nnUNet_preprocessed'] = preprocessed_dir
                    os.environ['nnUNet_results'] = results_dir
                    self.log_updated.emit("nnU-Netの環境変数を設定しました。")

                    cmd2 = [
                        "nnUNetv2_predict",
                        "-i", input_nifti_dir,
                        "-o", output_segmentation_dir,
                        "-d", "Dataset111_453CT",
                        "-c", "3d_fullres",
                        "-f", "0",
                        "-device", self.device # self.device を使用
                    ]
                    self.nnunet_predict_started.emit() # 追加
                    self.run_command(cmd2)
                    self.nnunet_predict_finished.emit() # 追加
                    if not self.is_running: break
                    self.progress_updated.emit(int(base_progress + step_progress_unit * 2))
                    self.log_updated.emit("--- ステップ2: 完了 ---")

                    # --- ステップ3: NIfTIセグメンテーションからSTLへの変換 ---
                    if not self.is_running: break
                    self.log_updated.emit("--- ステップ3: NIfTIからSTLへの変換を開始... ---")
                    segmentation_file = os.path.join(output_segmentation_dir, "case.nii.gz")

                    if not os.path.exists(segmentation_file):
                         raise FileNotFoundError(f"セグメンテーションファイルが見つかりません: {segmentation_file}")

                    target_labels = [1, 2, 3, 4, 5]
                    nifti_to_stl(segmentation_file, case_output_dir, target_labels) # 出力先をcase_output_dirに変更
                    self.log_updated.emit(f"STLファイルを {case_output_dir} に保存しました。")
                    self.progress_updated.emit(int(base_progress + step_progress_unit * 3))
                    self.log_updated.emit("--- ステップ3: 完了 ---")

            if not self.is_running: # ループが中止された場合
                self.finished.emit("cancelled", "処理がユーザーによって中止されました。")
                return

            self.finished.emit("success", "全ての処理が正常に完了しました。")

        except Exception as e:
            if self.is_running:
                error_message = f"エラーが発生しました: {e}"
                self.log_updated.emit(error_message)
                self.finished.emit("error", error_message)
        finally:
            # 処理が完了または中止された場合、一時ディレクトリは自動的にクリーンアップされる
            pass

    def run_command(self, cmd):
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8')
        for line in iter(process.stdout.readline, ''):
            if not self.is_running:
                process.terminate()
                self.log_updated.emit("--- 処理を中止しています... ---")
                break
            self.log_updated.emit(line.strip())
        process.wait()
        if not self.is_running:
            return
        if process.returncode != 0:
            raise RuntimeError(f"コマンドがエラーで終了しました: {' '.join(cmd)}")

    def stop(self):
        self.is_running = False

# --- メインウィンドウ ---
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DICOM to STL Converter")
        self.setGeometry(100, 100, 700, 600) # ウィンドウサイズを少し大きく
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        # --- 入力エリア (QListWidgetに変更) ---
        input_group_box = QGroupBox("入力DICOMフォルダ (最大5つ)")
        input_group_layout = QVBoxLayout()
        self.input_list_widget = QListWidget()
        self.input_list_widget.setMaximumHeight(100) # リストの最大高さを設定
        input_group_layout.addWidget(self.input_list_widget)

        input_buttons_layout = QHBoxLayout()
        add_folder_button = QPushButton("DICOMフォルダを追加")
        remove_folder_button = QPushButton("選択を削除")
        input_buttons_layout.addWidget(add_folder_button)
        input_buttons_layout.addWidget(remove_folder_button)
        input_group_layout.addLayout(input_buttons_layout)
        input_group_box.setLayout(input_group_layout)

        output_layout = QHBoxLayout()
        self.output_path_edit = QLineEdit("STLファイルの保存先を選択してください")
        output_button = QPushButton("出力先選択")
        output_layout.addWidgets(QLabel("出力:"), self.output_path_edit, output_button)

        # --- デバイス選択エリア ---
        device_group_box = QGroupBox("処理デバイス")
        device_layout = QHBoxLayout()
        self.cpu_radio = QRadioButton("CPU")
        self.gpu_radio = QRadioButton("GPU")
        device_layout.addWidget(self.cpu_radio)
        device_layout.addWidget(self.gpu_radio)
        device_layout.addStretch(1)
        device_group_box.setLayout(device_layout)

        buttons_layout = QHBoxLayout()
        self.run_button = QPushButton("変換開始")
        self.run_button.setStyleSheet("font-weight: bold; font-size: 16px; padding: 10px;")
        self.cancel_button = QPushButton("中止")
        self.cancel_button.setEnabled(False)
        buttons_layout.addWidgets(self.run_button, self.cancel_button)

        self.progress_bar = QProgressBar()
        self.log_text_edit = QTextEdit("ここに処理ログが表示されます...")
        self.log_text_edit.setReadOnly(True)

        self.status_label = QLabel("")
        self.animation_timer = QTimer(self)
        self.animation_frame = 0
        self.animation_timer.timeout.connect(self.update_status_animation)

        main_layout.addWidget(input_group_box) # input_layout の代わりに group_box を追加
        main_layout.addLayout(output_layout)
        main_layout.addWidget(device_group_box)
        main_layout.addLayout(buttons_layout)
        main_layout.addWidgets(QLabel("進捗:"), self.progress_bar, QLabel("ログ:"), self.log_text_edit, self.status_label)

        add_folder_button.clicked.connect(self.add_input_folder)
        remove_folder_button.clicked.connect(self.remove_selected_folder)
        output_button.clicked.connect(self.select_output_folder)
        self.run_button.clicked.connect(self.start_conversion)
        self.cancel_button.clicked.connect(self.cancel_conversion)

        self.worker = None
        self.check_device_availability()

    def add_input_folder(self):
        if self.input_list_widget.count() >= 5:
            QMessageBox.warning(self, "制限", "最大5つのDICOMフォルダまで登録できます。")
            return
        folder_path = QFileDialog.getExistingDirectory(self, "DICOMフォルダを選択")
        if folder_path and folder_path not in [self.input_list_widget.item(i).text() for i in range(self.input_list_widget.count())]:
            self.input_list_widget.addItem(folder_path)

    def remove_selected_folder(self):
        current_row = self.input_list_widget.currentRow()
        if current_row >= 0:
            self.input_list_widget.takeItem(current_row)

    def select_output_folder(self):
        path = QFileDialog.getExistingDirectory(self, "保存先フォルダを選択")
        if path: self.output_path_edit.setText(path)

    def start_conversion(self):
        input_dirs = [self.input_list_widget.item(i).text() for i in range(self.input_list_widget.count())]
        output_dir = self.output_path_edit.text()

        if not input_dirs:
            QMessageBox.warning(self, "注意", "DICOMフォルダを1つ以上登録してください。")
            return
        if not all([output_dir, os.path.isdir(output_dir)]):
            QMessageBox.warning(self, "注意", "有効な出力先フォルダを選択してください。")
            return

        self.run_button.setEnabled(False)
        self.cancel_button.setEnabled(True)
        self.progress_bar.setValue(0)
        self.log_text_edit.clear()

        device = 'cpu'
        if self.gpu_radio.isChecked():
            if torch.cuda.is_available():
                device = 'cuda'
            elif torch.backends.mps.is_available():
                device = 'mps'
        
        self.worker = ConversionWorker(input_dirs, output_dir, device) # input_dirs を渡す
        self.worker.log_updated.connect(self.append_log)
        self.worker.progress_updated.connect(self.progress_bar.setValue)
        self.worker.finished.connect(self.on_conversion_finished)
        self.worker.nnunet_predict_started.connect(self.start_animation)
        self.worker.nnunet_predict_finished.connect(self.stop_animation)
        self.worker.start()

    def cancel_conversion(self):
        if self.worker: self.worker.stop()

    def append_log(self, text):
        self.log_text_edit.append(text)
        self.log_text_edit.ensureCursorVisible()

    def on_conversion_finished(self, status, message):
        self.run_button.setEnabled(True)
        self.cancel_button.setEnabled(False)
        if status == "success":
            QMessageBox.information(self, "完了", message)
        elif status == "error":
            QMessageBox.critical(self, "エラー", message)
        elif status == "cancelled":
            self.append_log(f"--- {message} ---")
        self.worker = None
        self.stop_animation()

    def closeEvent(self, event):
        if self.worker and self.worker.isRunning():
            self.worker.stop()
            self.worker.wait()
        event.accept()

    def check_device_availability(self):
        self.gpu_radio.setEnabled(False)
        self.cpu_radio.setChecked(True)

        if torch.cuda.is_available():
            self.gpu_radio.setEnabled(True)
            self.gpu_radio.setText("GPU (CUDA)")
            self.gpu_radio.setChecked(True)
            self.append_log("CUDA対応GPUが検出されました。")
        elif torch.backends.mps.is_available():
            self.gpu_radio.setEnabled(True)
            self.gpu_radio.setText("GPU (Metal)")
            self.gpu_radio.setChecked(True)
            self.append_log("Apple Silicon GPU (Metal)が検出されました。")
        else:
            self.append_log("GPUは検出されませんでした。CPUで処理します。")

    def start_animation(self):
        self.animation_frame = 0
        self.animation_timer.start(500)

    def stop_animation(self):
        self.animation_timer.stop()
        self.status_label.clear()

    def update_status_animation(self):
        dots = "." * (self.animation_frame % 4)
        self.status_label.setText(f"AIモデル処理中{dots}")
        self.animation_frame += 1

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())