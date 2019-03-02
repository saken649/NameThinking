const functions = require('firebase-functions');
const express = require('express')
const app = express()
const axios = require('axios')

/**
 * Admin SDK & Firestore
 */
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const firestore = admin.firestore()

/**
 * for Codic API
 */
const codic = axios.create({
  baseURL: 'https://api.codic.jp',
  method: 'post',
  headers: {
    'Authorization': `Bearer ${functions.config().codic.key}`
  }
})

/**
 * for Slack API
 */
const slack = axios.create({
  // baseURL: functions.config().slack.hook_url,
  method: 'post'
})

/**
 * Allow CORS
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Headers', 'access-control-allow-origin')
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Max-Age', '86400')
  next()
})
app.options('*', (req, res) => {
  res.sendStatus(200)
})

/**
 * RequestBody.casing用Enum
 */
const CASING = {
  NO_CASING: {
    param: '',
    text: 'no casing'
  },
  CAMEL: {
    param: 'camel',
    text: 'camelCase'
  },
  PASCAL: {
    param: 'pascal',
    text: 'PascalCase'
  },
  SNAKE: {
    param: 'lower underscore',
    text: 'snake_case'
  },
  UPPER: {
    param: 'upper underscore',
    text: 'UPPER_CASE',
  },
  KEBAB: {
    param: 'hyphen',
    text: 'kebab-case'
  }
}

/***** Main Function *****/

// /nt
app.post('/nocasing', (req, res) => {
  main(req, res, CASING.NO_CASING)
})
// /ntcamel
app.post('/camel', (req, res) => {
  main(req, res, CASING.CAMEL)
})
// /ntpascal
app.post('/pascal', (req, res) => {
  main(req, res, CASING.PASCAL)
})
// /ntsnake
app.post('/snake', (req, res) => {
  main(req, res, CASING.SNAKE)
})
// /ntupper
app.post('/upper', (req, res) => {
  main(req, res, CASING.UPPER)
})
// /ntkebab
app.post('/kebab', (req, res) => {
  main(req, res, CASING.KEBAB)
})

/**
 * main function
 * @param {*} req Request
 * @param {*} res Express.res
 * @param {*} casing codic.engine.casing
 */
function main(req, res, casing) {
  res.status(200).send()

  _checkRegistered(req, res)
    .then(response => {
      if (response === null) {
        // res.status(500).send()
      } else {
        return response.data().url
      }
    })
    .then(url => {
      _main(req, res, casing, url)
    })
    .catch(err => {
      console.log(err)
      // res.status(500).send(err)
    })

  function _checkRegistered(req) {
    return firestore.collection('teams')
                    .doc(req.body.team_id)
                    .get()
                    .then(response => {
                      if (!response.exists) {
                        return null
                      }
                      return response
                    })
                    .catch(err => {
                      return null
                    })
  }

  function _main(req, res, casing, url) {
    if (req.body.text === '') {
      postSlack({ text: '何も変換出来ない:thinking_face:' }, res, url, req.body.command)
      return
    }
    
    // Codic問い合わせ
    const reqBody = { text: req.body.text }
    if (casing.param !== CASING.NO_CASING.param) {
      reqBody.casing = casing.param
    }
    codic.post('/v1/engine/translate.json', reqBody)
      .then(codicResponse => {
        const codicResult = codicResponse.data[0]
        // wordsを整形
        const wordList = makeWordList(codicResult.words)
        // Slackに投げるオブジェクトを整形
        const msgBody = makeMsgBodyForPostSlack(codicResult.text, codicResult.translated_text, wordList, casing.text)
        // 投稿
        postSlack(msgBody, res, url)
      })
      .catch(err => {
        // afterPost(500, err, res)
      })
  }
}

/***** Sub Methods *****/

/**
 * Slackへの投稿
 * @param {*} reqBody 
 * @param {*} expressRes Express.res
 * @param {*} url
 */
function postSlack(reqBody, expressRes, url) {
  return slack.post(url, reqBody)
    .then(() => {
      // afterPost(200, '', expressRes)
    })
    .catch(err => {
      // afterPost(500, err, expressRes)
    })
}

/**
 * SlackへのPost後の処理
 * @param {*} status 
 * @param {*} toLog 
 * @param {*} expressRes 
 */
function afterPost(status, toLog, expressRes) {
  if (status !== 200) {
    console.log(toLog)
  }
  // expressRes.status(status).send(toLog)
}

/**
 * wordsを整形して返却
 * text: 翻訳前の日本語
 * candidates: 翻訳後の候補をカンマ繋ぎにしたもの
 * @param {*} words 
 */
function makeWordList(words) {
  const wordList = []
  words.forEach(word => {
    const candidates = word.successful
      ? word.candidates
        .filter(x => x.text !== null)
        .map(x => {
          // 最有力候補になっている文字は太字
          if (x.text === word.translated_text) {
            return `*${x.text}* `
          } else {
            return x.text
          }
        })
        .toString()
        .replace(/\,/g, ', ')
      : '(no translated text)'
    wordList.push({
      text: word.text,
      candidates: candidates
    })
  })
  return wordList
}

/**
 * Slackのincoming webhooksに投げるRequest Bodyを生成する
 * @param {*} text 
 * @param {*} translated 
 * @param {*} wordList 
 * @param {*} casing
 */
function makeMsgBodyForPostSlack(text, translated, wordList, casing) {
  // 最有力候補
  const mostPrime = {
    color: '#36a64f',
    fields: [{
      value: translated
    }]
  }

  // 単語ごとの変換候補
  const fields = wordList
    .map(word => {
      return {
        title: word.text,
        value: word.candidates
      }
    })
  
  return {
    response_type: 'in_channel',
    text: `「${text}」の命名候補\n\ncasing：${casing}`,
    attachments: [
      mostPrime,
      { fields: fields }
    ]
  }
}

exports.api = functions.https.onRequest(app)