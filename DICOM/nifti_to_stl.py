import SimpleITK as sitk
import numpy as np
from skimage import measure
from stl import mesh
import os
import vtk # 追加
from vtk.util import numpy_support # 追加

def nifti_to_stl(nifti_path, output_dir, label_values):
    """
    NIfTIファイルから特定のラベル値の3Dメッシュを抽出し、STLファイルとして保存します。

    Args:
        nifti_path (str): 入力NIfTIファイルのパス。
        output_dir (str): 出力STLファイルを保存するディレクトリ。
        label_values (list): STLに変換するセグメンテーションのラベル値のリスト。
    """
    print(f"Loading NIfTI file: {nifti_path}")
    image = sitk.ReadImage(nifti_path)
    image_array = sitk.GetArrayFromImage(image) # SimpleITK画像をNumPy配列に変換

    for label_value in label_values:
        label_name = ""
        if label_value == 1:
            label_name = "Upper_Skull"
        elif label_value == 2:
            label_name = "Mandible"
        elif label_value == 3:
            label_name = "Upper_Teeth"
        elif label_value == 4:
            label_name = "Lower_Teeth"
        elif label_value == 5:
            label_name = "Mandibular_canal"
        else:
            label_name = f"label_{label_value}"

        output_stl_file = os.path.join(output_dir, f"{label_name}.stl")

        # 特定のラベル値を持つ領域をバイナリマスクとして抽出
        binary_mask = (image_array == label_value)

        # バイナリマスクが空でないことを確認
        if not np.any(binary_mask):
            print(f"Warning: No voxels found for label {label_value} ({label_name}). Skipping STL generation.")
            continue

        print(f"Extracting mesh for label: {label_value} ({label_name}) using marching cubes...")
        # Marching Cubesアルゴリズムを使用して3Dメッシュを生成
        verts, faces, normals, values = measure.marching_cubes(binary_mask, level=0)

        # --- 平滑化処理 --- (VTK Windowed Sinc Smoothing)
        if len(verts) > 0 and len(faces) > 0: # 頂点と面が存在する場合のみ平滑化
            print(f"Smoothing mesh for {label_name} using VTK Windowed Sinc smoothing...")

            # 1. NumPy配列からVTK PolyDataを作成
            points = vtk.vtkPoints()
            points.SetData(numpy_support.numpy_to_vtk(verts))

            polys = vtk.vtkCellArray()
            # facesは(N, 3)のnumpy配列なので、VTKの形式に変換
            # VTKのCellArrayは [n_points, p1, p2, p3, n_points, p4, p5, p6, ...] の形式
            vtk_faces = np.hstack((np.full((faces.shape[0], 1), 3), faces)).flatten()
            polys.SetCells(faces.shape[0], numpy_support.numpy_to_vtk(vtk_faces, deep=True, array_type=vtk.VTK_ID_TYPE)) # 修正

            poly_data = vtk.vtkPolyData()
            poly_data.SetPoints(points)
            poly_data.SetPolys(polys)

            # 2. vtkWindowedSincPolyDataFilter を適用
            smoother = vtk.vtkWindowedSincPolyDataFilter()
            smoother.SetInputData(poly_data)
            smoother.SetNumberOfIterations(30) # 繰り返し回数 # 修正
            smoother.SetPassBand(0.01) # 平滑化の強度 (0.01 - 0.1 程度が一般的) # 修正
            smoother.SetFeatureEdgeSmoothing(False) # 特徴的なエッジを保持 # 修正
            smoother.SetBoundarySmoothing(True) # 境界を平滑化
            smoother.SetNonManifoldSmoothing(True) # 非多様体メッシュを平滑化
            smoother.Update()

            smoothed_poly_data = smoother.GetOutput()

            # 3. VTK PolyDataからNumPy配列に戻す
            smoothed_verts = numpy_support.vtk_to_numpy(smoothed_poly_data.GetPoints().GetData())
            smoothed_faces_vtk = numpy_support.vtk_to_numpy(smoothed_poly_data.GetPolys().GetData())

            # VTKの面データは [n_points, p1, p2, p3, ...] 形式なので、(N, 3)に変換
            # n_points (通常3) をスキップして、インデックスだけを抽出
            smoothed_faces = smoothed_faces_vtk.reshape(-1, 4)[:, 1:4]

            # 平滑化されたメッシュデータをnumpy-stl形式に戻す
            mesh_data = mesh.Mesh(np.zeros(smoothed_faces.shape[0], dtype=mesh.Mesh.dtype))
            for i, f in enumerate(smoothed_faces):
                for j in range(3):
                    mesh_data.vectors[i][j] = smoothed_verts[f[j]]
            print(f"Smoothing for {label_name} complete!")
        else:
            print(f"Warning: No valid mesh generated for label {label_value} ({label_name}). Skipping smoothing.")
            # メッシュが生成されなかった場合は、元のmarching_cubesの出力をそのまま使う
            mesh_data = mesh.Mesh(np.zeros(faces.shape[0], dtype=mesh.Mesh.dtype))
            for i, f in enumerate(faces):
                for j in range(3):
                    mesh_data.vectors[i][j] = verts[f[j],:]

        print(f"Saving STL file: {output_stl_file}")
        mesh_data.save(output_stl_file)
        print(f"Conversion for {label_name} complete!")

if __name__ == "__main__":
    # Dockerコンテナ内で実行されるパスに修正
    input_nifti_file = "/app/output_segmentation/case.nii.gz"
    output_directory = "/app/output_stl/"

    # 変換したいラベル値のリスト
    # "Upper Skull": 1,
    # "Mandible": 2,
    # "Upper Teeth": 3,
    # "Lower Teeth": 4,
    # "Mandibular canal": 5
    target_labels = [1, 2, 3, 4, 5]

    nifti_to_stl(input_nifti_file, output_directory, target_labels)