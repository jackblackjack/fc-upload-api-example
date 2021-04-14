'use strict'
/**
 * Thing model.
 * @version 2021-04-13
 */
const Mongoose = require('mongoose')
      , Schema = Mongoose.Schema

const ThingSchema = new Schema({
  is_deleted: {
    type: Boolean,
    required: true,
    default: false
  },
  attrs: [Schema.Types.Mixed],
}, { strict: false, timestamps: { createdAt: true, updatedAt: false }, versionKey: 'version' })

module.exports = Mongoose.model('Thing', ThingSchema)
