# Pythonの公式イメージをベースにする
FROM python:3.13-slim-bookworm

# 作業ディレクトリを設定
WORKDIR /app

# 必要なファイルをコピー
COPY requirements.txt .
COPY nifti_to_stl.py .
COPY run_pipeline.sh .

# nnU-Netのモデルファイルをコピー
# Dataset111_453CT_v100.zip はプロジェクトのルートディレクトリにあると仮定
COPY Dataset111_453CT_v100.zip .

# dcm2niix とビルドに必要なツールをインストール
# Debianベースのイメージなのでaptを使用
RUN apt-get update && apt-get install -y dcm2niix build-essential

# Pythonの依存関係をインストール
RUN pip install --no-cache-dir -r requirements.txt

# nnU-Netのパスを設定
# nnUNet_results はコンテナ内の /app/nnUNet_results に設定
ENV nnUNet_results="/app/nnUNet_results"

# nnU-Netのモデルをインストール
# nnUNetv2_install_pretrained_model_from_zip はnnunetv2パッケージに含まれる
RUN nnUNetv2_install_pretrained_model_from_zip Dataset111_453CT_v100.zip

# 実行スクリプトに実行権限を付与
RUN chmod +x run_pipeline.sh

# コンテナ起動時に実行されるコマンド
# ユーザーがDICOMデータをマウントして実行することを想定
CMD ["./run_pipeline.sh"]
