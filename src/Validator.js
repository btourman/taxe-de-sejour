const Ajv = require('ajv')
const ajv = new Ajv({ allErrors: true, format: 'fast' })

const validate = (schema, data) => {
    if (ajv.validate(schema, data)) {
        return data
    } else {
        console.error(ajv.errors)
        return false
    }
}

module.exports = { validate }
