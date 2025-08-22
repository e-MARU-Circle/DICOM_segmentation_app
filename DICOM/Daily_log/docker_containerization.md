# Dockerコンテナ化のプロセス

## 目的
環境に依存せず誰でも簡単に実行できるように、Dockerコンテナとして配布可能な形にする。

## メリット
- **環境の統一:** 開発環境と実行環境を一致させ、"私のマシンでは動くのに..."という問題を解消。
- **依存関係の管理:** 必要なライブラリやツールをコンテナ内に含めるため、ユーザーは個別にインストールする必要がない。
- **ポータビリティ:** コンテナイメージを共有するだけで、どこでも同じようにプログラムを実行できる。

## ステップ

### 1. `nifti_to_stl.py` の修正
- **変更点:** Dockerコンテナ内で実行されることを想定し、入力NIfTIファイルのパスと出力STLファイルのディレクトリをコンテナ内のパス（`/app/output_segmentation/case.nii.gz` と `/app/output_stl/`）に修正。
- **理由:** コンテナ内のファイルシステム構造に合わせるため。

### 2. `requirements.txt` の作成
- **内容:** プロジェクトに必要なPythonライブラリ（`SimpleITK`, `scikit-image`, `pydicom`, `numpy`, `torch`, `torchvision`, `torchaudio`, `nnunetv2`, `pyside6`, `numpy-stl`）をリストアップ。
- **理由:** Dockerfileでこれらの依存関係を一括でインストールするため。

### 3. `run_pipeline.sh` の作成
- **内容:** DICOMからNIfTIへの変換 (`dcm2niix`)、AIモデルによるセグメンテーション (`nnUNetv2_predict`)、NIfTIセグメンテーションからSTLへの変換 (`nifti_to_stl.py`) の一連の処理を自動化するシェルスクリプト。
- **注意点:**
    - `dcm2niix` はDockerコンテナ内で別途インストールされる。
    - `nnUNet_results` 環境変数はDockerfile内で設定されるため、スクリプト内では設定しない。
    - 入力・出力パスはコンテナ内のパス（`/app/test_dicom_data`, `/app/input_nifti`, `/app/output_segmentation`, `/app/output_stl`）を使用。
    - `nnUNetv2_predict` の `-device cpu` オプションは、GPUが利用できない環境でも動作するようにするため。
- **理由:** Dockerコンテナ起動時に、一連の処理を自動で実行させるため。

### 4. `Dockerfile` の作成
- **内容:** Dockerイメージをビルドするための指示書。
    - `FROM python:3.13-slim-bookworm`: Python 3.13がインストールされた軽量なDebianベースイメージを使用。
    - `WORKDIR /app`: コンテナ内の作業ディレクトリを設定。
    - `COPY`: 必要なファイル（`requirements.txt`, `nifti_to_stl.py`, `run_pipeline.sh`, `Dataset111_453CT_v100.zip`）をコンテナ内にコピー。
    - `RUN apt-get install -y dcm2niix`: `dcm2niix` をインストール。
    - `RUN pip install -r requirements.txt`: Pythonの依存関係をインストール。
    - `ENV nnUNet_results="/app/nnUNet_results"`: `nnUNet_results` 環境変数を設定。
    - `RUN python3 -m nnunetv2.inference.predict_from_raw_data nnUNetv2_install_pretrained_model_from_zip Dataset111_453CT_v100.zip`: nnU-Netのモデルをインストール。
    - `RUN chmod +x run_pipeline.sh`: 実行スクリプトに実行権限を付与。
    - `CMD ["./run_pipeline.sh"]`: コンテナ起動時に `run_pipeline.sh` を実行。
- **理由:** プログラムとその依存関係、実行環境をパッケージ化し、配布可能なイメージを作成するため。

### 5. Dockerイメージのビルドと実行方法の説明
- **ビルドコマンド:** `docker build -t dicom_segmentation_app .`
- **実行コマンド:**
  ```bash
  docker run -v /path/to/your/dicom_data:/app/test_dicom_data \
             -v /path/to/output_results:/app/output_stl \
             dicom_segmentation_app
  ```
- **説明:** ユーザーがDockerイメージをビルドし、自身のDICOMデータをマウントしてプログラムを実行するための具体的な手順を提供。
- **理由:** ユーザーがプログラムを簡単に利用できるようにするため。

## 今後の展望
このDockerコンテナを使用することで、@e_maru 先生のプログラムは、Dockerがインストールされている環境であればどこでも、同じように動作することが保証されます。これにより、プログラムの配布と利用が大幅に簡素化されます。
