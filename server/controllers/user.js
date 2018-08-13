const User = require('../models/user')
const { normalizeErrors } = require('../helpers/mongoose')
const jwt = require('jsonwebtoken')
const config = require('../config')

exports.auth = function (req, res) {
  const { email, password } = req.body

  if (!password || !email) {
    return res.status(422).send({ errors: [{ title: 'Missing data!', detail: 'Provide username and password!' }] })
  }

  User.findOne({ email }, function (err, user) {
    if (err) {
      return res.status(422).send({ errors: normalizeErrors(err.errors) })
    }

    if (!user) {
      return res.status(422).send({ errors: [{ title: 'Invalid credentials!', detail: 'Wrong email or password!' }] })
    }

    if (user.hasSamePassword(password)) {
      const token = jwt.sign({
        userId: user._id,
        username: user.username
      }, config.SECRET, { expiresIn: '1h' })

      return res.json({ token })
    } else {
      return res.status(422).send({ errors: [{ title: 'Invalid credentials!', detail: 'Wrong email or password!' }] })
    }
  })
}

exports.register = function (req, res) {
  const { username, email, password, passwordConfirmation } = req.body

  if (!username || !email) {
    return res.status(422).send({ errors: [{ title: 'Missing data!', detail: 'Provide username and password!' }] })
  }

  if (password !== passwordConfirmation) {
    return res.status(422).send({ errors: [{ title: 'Invalid password!', detail: 'Password is not the same as confirmation!' }] })
  }

  User.findOne({ email }, function (err, existingUser) {
    if (err) {
      return res.status(422).send({ errors: normalizeErrors(err.errors) })
    }

    if (existingUser) {
      return res.status(422).send({ errors: [{ title: 'Invalid email!', detail: 'Email already in use!' }] })
    }

    const user = new User({
      username,
      email,
      password
    })

    user.save(function (err) {
      if (err) {
        return res.status(422).send({ errors: normalizeErrors(err.errors) })
      }

      return res.json({ 'registred': true })
    })
  })
}

exports.authMiddleware = function (req, res, next) {
  const token = req.headers.authorization

  if (token) {
    const user = parseToken(token)

    User.findById(user.userId, function (err, user) {
      if (err) {
        return res.status(422).send({ errors: normalizeErrors(err.errors) })
      }

      if (user) {
        res.locals.user = user
        next()
      } else {
        return notAuthorized(res)
      }
    })
  } else {
    return notAuthorized(res)
  }
}

function parseToken(token) {

  return jwt.verify(token.split(' ')[1], config.SECRET)
}

function notAuthorized(res) {
  return res.status(401).send({ errors: [{ title: 'Not authorized!', detail: 'You need to login to get access!' }] })
}