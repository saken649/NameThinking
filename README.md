# NameThinking

変数名やメソッド名の命名に困った際に、SlackのSlashコマンドから、その候補を提示してもらうSlackアプリです。  
実態は、Slackから [codic](https://codic.jp) のAPIを利用出来るようにしたものです。

![command](https://user-images.githubusercontent.com/13757996/53863960-b7553a00-402e-11e9-9374-0c319376c479.png)

↓↓↓

![result](https://user-images.githubusercontent.com/13757996/53863980-c4722900-402e-11e9-8459-6b2cafdb30ff.png)


Firebaseでホスティングすることを前提としています。

## 事前設定

### Firebase

事前にFirebaseのプロジェクトを作成し、以下コマンドで紐づけを行ってください。
```
$ firebase use --add プロジェクト名
```

### npm

```
$ npm install
```

### Codic

[codic](https://codic.jp) のアカウントを取得し、APIキーを取得してください。

### 環境変数類

上記で取得してきたCodicのAPIキーを、以下コマンドでFirebaseの変数にセットしてください。

```
$ firebase funtions:config:set codic.key="CodicのAPI Keyを取得してセットしてください。"
```

ローカルでエミュレーター起動する場合は、事前に環境変数群をファイルにセットしておく必要があります。

```
$ firebase functions:config:get > ./runtimeconfig.json
```

## デプロイなど

Firebaseへdeploy
```
$ firebase deploy
```

ローカルでエミュレーター起動する
```
$ firebase serve
```

## APIエンドポイント

エンドポイントが7つあります。  
必要に応じて、Slackのスラッシュコマンドを設定してください。

### /nocasing

ケース変換無し。スペース区切りで返却。

```
get username
```

### /camel

ローワーキャメルケースで返却。

```
getUsername
```

### /pascal

パスカルケース(アッパーキャメルケース)で返却。

```
GetUsername
```

### /snake

スネークケースで返却。

```
get_username
```

### /upper

アッパーケースで返却。

```
GET_USERNAME
```

### /kebab

ケバブケース。

```
get-username
```