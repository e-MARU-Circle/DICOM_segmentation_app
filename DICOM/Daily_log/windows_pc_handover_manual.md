## Windows PCへのプロジェクト引き継ぎマニュアル

### 目的
macOSで開発中のDICOMセグメンテーションプロジェクトをWindows PCに引き継ぎ、開発環境を構築し、アプリケーションを実行できるようにする。

### 前提条件
- Windows 10/11 PC
- Gitがインストール済みであること
- Python 3.13がインストール済みであること (推奨: pyenv-winなどでのバージョン管理)
- Docker Desktop for Windowsがインストール済みであること (nnU-NetのDocker実行を検討する場合)
- WSL2 (Windows Subsystem for Linux 2) が有効化されていること (推奨: Linux環境での開発を再現する場合)

### 引き継ぎ手順

#### 1. プロジェクトのリポジトリをクローン
- Windows PCでプロジェクトを配置したいディレクトリに移動します。
- コマンドプロンプトまたはPowerShellを開き、以下のコマンドでリポジトリをクローンします。
```bash
git clone https://github.com/e-MARU-Circle/DICOM_segmentation_app.git
cd DICOM_segmentation_app
```

#### 2. Python環境のセットアップ

##### オプションA: ローカルPython環境での実行 (推奨)
- **Pythonのインストール:** Python 3.13がインストールされていることを確認します。推奨はpyenv-winなどのツールでバージョン管理を行うことです。
- **仮想環境のセットアップ:** プロジェクトディレクトリに移動し、仮想環境を作成・有効化します。
```bash
python -m venv venv
.\venv\Scripts\activate  # PowerShellの場合
vend\Scripts\activate.bat # コマンドプロンプトの場合
```
- **Python依存関係のインストール:** `requirements.txt`に記載されているすべてのパッケージをインストールします。
```bash
pip install -r requirements.txt
```
  - **注意点:** `torch`, `torchvision`, `torchaudio`はWindows環境（特にGPU利用時）でインストール方法が異なる場合があります。PyTorchの公式ドキュメント（`https://pytorch.org/get-started/locally/`）を参照し、お使いのGPU（NVIDIA/AMD）やCUDAバージョンに合わせたコマンドでインストールしてください。
- **`dcm2niix`のインストール:** 
  - `dcm2niix`のWindows版実行ファイルをダウンロードし、PATHが通っているディレクトリに配置します。公式GitHubリポジトリ（`https://github.com/rordenlab/dcm2niix/releases`）からダウンロード可能です。
- **nnU-Netv2モデルの準備:** 
  - `Dataset111_453CT_v100.zip`ファイルをダウンロードし、nnU-Netv2が認識できる場所に配置します。
  - 環境変数を設定します。Windowsでは、システム環境変数として設定するか、バッチファイル/PowerShellスクリプトで設定します。
    ```cmd
    set nnUNet_raw_data_base="C:\path\to\your\nnunet_raw_data"
    set nnUNet_preprocessed="C:\path\to\your\nnunet_preprocessed"
    set nnUNet_results="C:\path\to\your\nnunet_results"
    ```
  - `nnUNetv2_install_pretrained_model_from_zip`コマンドでモデルをインストールします。
- **`run_pipeline.sh`の調整:** 
  - `run_pipeline.sh`はBashスクリプトのため、WindowsのコマンドプロンプトやPowerShellでは直接実行できません。WSL2環境で実行するか、同等の処理を行うバッチファイル/PowerShellスクリプトを作成する必要があります。
  - スクリプト内のパスは、Windows形式のパス（例: `C:\Users\...\`）に修正が必要です。

##### オプションB: Dockerコンテナでの実行
- **Docker Desktop for Windowsのインストール:** Docker Desktopをインストールし、起動します。
- **WSL2の有効化:** Docker DesktopがWSL2を使用するように設定されていることを確認します。
- **Dockerイメージのビルド:** プロジェクトディレクトリに移動し、以下のコマンドでDockerイメージをビルドします。
```bash
docker build -t dicom_segmentation_app .
```
  - **注意点:** `Dockerfile`内の`RUN apt-get install`などのLinuxコマンドはWSL2環境で実行されます。
  - GPUを使用する場合、`Dockerfile`にCUDA関連のライブラリを追加し、`docker run`コマンドに`--gpus all`オプションを追加する必要があります。
- **Dockerコンテナの実行:** 
  - `docker run`コマンドでコンテナを実行します。パスのマウントはWindows形式のパスで行います。
```bash
docker run --rm -v C:\path\to\your\DICOM_data:/app/test_dicom_data dicom_segmentation_app
```
  - メモリ不足エラーが発生した場合は、`--memory`オプションでメモリを増やしてください。

#### 3. GUIアプリケーションの実行
- ローカルPython環境で実行する場合: 仮想環境を有効化した後、`python main_app.py`を実行します。
- Dockerコンテナ内でGUIを実行する場合: Xサーバーの設定など、追加の複雑な設定が必要です。通常は、ローカルのGUIからDockerコンテナ内の処理を呼び出すアーキテクチャが推奨されます。

### 注意事項
- `nnU-Netv2`は大量のメモリを消費する可能性があります。PCのRAMが不足する場合、ローカル環境でもDockerコンテナでもメモリ不足エラーが発生する可能性があります。
- `nnU-Netv2`のデータセットの命名規則や構造は厳格です。入力データが正しく準備されていることを確認してください。
