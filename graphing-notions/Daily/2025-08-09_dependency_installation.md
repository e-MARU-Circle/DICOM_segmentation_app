# 2025年8月9日 - 依存関係のインストール

## 目的
プロジェクトの依存関係をインストールし、開発サーバーを起動する準備をします。

## 手順

### 1. ルートディレクトリの依存関係をインストール

ルートディレクトリ (`/Users/ema/Desktop/VScode/graphing-notions/`) で `npm install` を実行します。

```bash
npm install
```

### 2. `client`ディレクトリの依存関係をインストール

`client`ディレクトリ (`/Users/ema/Desktop/VScode/graphing-notions/client/`) で `npm install` を実行します。

```bash
cd client
npm install
cd ..
```

## 実行結果

#### ルートディレクトリ (`npm install`)

```
added 65 packages, and audited 434 packages in 702ms

170 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

#### `client`ディレクトリ (`cd client && npm install`)

```
added 45 packages, and audited 269 packages in 561ms

49 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

## 次のステップ

すべての依存関係のインストールが完了しました。