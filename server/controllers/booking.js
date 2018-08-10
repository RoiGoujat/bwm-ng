const { normalizeErrors } = require('../helpers/mongoose')
const Booking = require('../models/booking')
const Rental = require('../models/rental')
const User = require('../models/user')
const moment = require('moment')

exports.createBooking = function (req, res) {
  const { startAt, endAt, totalPrice, guests, days, rental } = req.body
  const user = res.locals.user

  const booking = new Booking({ startAt, endAt, totalPrice, guests, days })

  Rental.findById(rental._id)
        .populate('bookings')
        .populate('user')
        .exec(function (err, foundRental) {

      if (err) {
        return res.status(422).send({ errors: normalizeErrors(err.errors) })
      }

      if (foundRental.user.id === user.id) {
        return res.status(422).send({ errors: [{ title: 'Invalid User!', detail: 'Cannot book your own rental!' }] })
      }

      if (isValidBooking(booking, foundRental)) {
        booking.user = user
        booking.rental = foundRental
        foundRental.bookings.push(booking)

        booking.save(function(err) {
          if (err) {
            return res.status(422).send({ errors: normalizeErrors(err.errors) })
          }

          foundRental.save()
          User.update({_id: user.id}, {$push: {bookings: booking}}, function(){})
  
          return res.json({startAt: booking.startAt, endAt: booking.endAt})
        })
      } else {
        return res.status(422).send({ errors: [{ title: 'Invalid Booking!', detail: 'Chosen dates are already taken!' }] })
      }
  })

  function isValidBooking(proposedBooking, rental) {
    let isValid = true
    
    if (rental.bookings && rental.bookings.length > 0) {

      isValid = rental.bookings.every(function(booking) {
        const proposedStartAt = moment(proposedBooking.startAt)
        const proposedEndAt = moment(proposedBooking.endAt)

        const currentStartAt = moment(booking.startAt)
        const currentEndAt = moment(booking.endAt)

        return ((currentStartAt < proposedStartAt && currentEndAt < proposedStartAt) ||
               (proposedEndAt < currentEndAt && proposedEndAt < currentStartAt))
      })
    }

    return isValid
  }
}