#!/bin/bash

# エラーが発生したらスクリプトを終了
set -e

# nnU-Netのパスを設定
export nnUNet_raw_data_base="/app/nnUNet_raw_data"
export nnUNet_preprocessed="/app/nnUNet_preprocessed"

# 入力と出力のディレクトリを定義
INPUT_DICOM_DIR="/app/test_dicom_data"
INPUT_NIFTI_DIR="/app/input_nifti"
OUTPUT_SEGMENTATION_DIR="/app/output_segmentation"
OUTPUT_STL_DIR="/app/output_stl"

# 必要なディレクトリを作成
mkdir -p $INPUT_NIFTI_DIR
mkdir -p $OUTPUT_SEGMENTATION_DIR
mkdir -p $OUTPUT_STL_DIR

echo "--- ステップ1: DICOMからNIfTIへの変換 ---"
# dcm2niix を使ってDICOMをNIfTIに変換
# -o: 出力ディレクトリ, -z y: gzip圧縮, -f %f: ファイル名を元のファイル名に
dcm2niix -o $INPUT_NIFTI_DIR -z y $INPUT_DICOM_DIR

echo "--- ステップ1.5: nnU-Net予測用のデータ準備 ---"
# nnU-Netが期待するディレクトリ構造を作成
PREDICT_INPUT_DIR="$nnUNet_raw_data_base/Dataset111_453CT/imagesTs"
mkdir -p $PREDICT_INPUT_DIR

# dcm2niixで生成されたファイルをnnU-Netの命名規則にリネームしてコピー
# ここでは、最初のファイルのみを例としてリネーム
NIFTI_FILE=$(find $INPUT_NIFTI_DIR -name "*.nii.gz" | head -n 1)
if [ -n "$NIFTI_FILE" ]; then
    # 簡略化のため、固定のIDを使用
    cp "$NIFTI_FILE" "$PREDICT_INPUT_DIR/001_0000.nii.gz"
    echo "Copied $NIFTI_FILE to $PREDICT_INPUT_DIR/001_0000.nii.gz"
else
    echo "Error: No NIfTI file found in $INPUT_NIFTI_DIR"
    exit 1
fi

echo "--- ステップ2: AIモデルによるセグメンテーション ---"
# nnUNetv2_predict を使ってセグメンテーションを実行
# -i: 入力NIfTIディレクトリ, -o: 出力セグメンテーションディレクトリ
# -d: データセット名, -c: 設定, -f: フォールド, -device: デバイス
nnUNetv2_predict -i "$PREDICT_INPUT_DIR" -o $OUTPUT_SEGMENTATION_DIR -d Dataset111_453CT -c 3d_fullres -f 0 -device mps -npp 1 -nps 1 --disable_tta

echo "--- ステップ3: NIfTIセグメンテーションからSTLへの変換 ---"
# Pythonスクリプトを実行してSTLを生成
python3 /app/nifti_to_stl.py

echo "--- 全ての処理が完了しました ---"
