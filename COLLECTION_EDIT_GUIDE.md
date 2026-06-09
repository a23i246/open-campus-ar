# コレクションページ編集ガイド

友人が編集するときに見る用の簡単な説明です。

## まず見るファイル

| ファイル | 役割 | よく編集する内容 |
|---|---|---|
| `collection.html` | コレクションページ本体 | タイトル、説明文、ボタン、モーダルのHTML |
| `js/dinosaurs.js` | 恐竜データ一覧 | 恐竜名、説明、画像、3Dモデル、リンク、大きさ |
| `js/collection-page.js` | コレクション画面の動き | カード表示、詳細表示、リセット処理 |
| `js/collection.js` | 保存処理 | localStorageへの保存・読み込み |
| `css/common.css` | 見た目 | カード、ボタン、モーダル、スマホ表示 |

## 一番よく触る場所

恐竜名・説明・画像・モデルを変えるなら、基本は `js/dinosaurs.js` だけでOKです。

例：説明文を変える場合

```js
name: 'プロトケラトプス',
description: 'ここを書き換えると説明文が変わります。',
```

## カードの見た目を変えたい場合

`css/common.css` のこのあたりを見ます。

- `.collection-grid`：カード全体の並び方
- `.collection-item`：カード1枚の見た目
- `.collection-item.locked`：未収集カードの見た目
- `.modal-card`：詳細画面の白い枠
- `.modal-model`：3Dモデル表示エリアの高さ

## 詳細画面の3Dモデルが大きい/小さい場合

`js/dinosaurs.js` の `collectionScale` を変えます。

```js
collectionScale: '0.35 0.35 0.35'
```

数字を大きくするとモデルが大きくなります。
数字を小さくするとモデルが小さくなります。
3つの数字は同じ値にしておくと安全です。

## 触らない方がいい場所

- `id`：保存済みコレクションと関係するので、途中で変えない方が安全です。
- `COLLECTION_KEY`：保存名なので、変えると今までの収集データが読めなくなります。
- `.patt` ファイル名：ARマーカーと対応しているので、変更するならHTML/JS側も合わせる必要があります。

## ローカル確認

直接HTMLを開かず、サーバーを立てて確認してください。

```powershell
cd C:\open-campus-ar
npx http-server . -p 8000
```

ブラウザで開くURL：

```text
http://127.0.0.1:8000/collection.html
```
