global.fetch = require("node-fetch")
const wretch = require('wretch')
const { sortBy, take } = require('lodash')

const transformResultToJson = ({ fields }) => {
    return {
        city: fields.nom_com,
        zipCode: fields.code_postal,
        insee: fields.insee_com
    }
}

const getByCityName = (city) => {
    return wretch(`https://data.opendatasoft.com/api/records/1.0/search/?dataset=code-postal-code-insee-2015%40public&q=${city}&rows=50&facet=insee_com&facet=nom_reg&facet=code_postal&facet=nom_com`)
        .get()
        .json(json => {
            console.log(json)
            return take(sortBy(json.records.map(t => transformResultToJson(t)), 'city'), 10)
        })
}

module.exports = {
    getByCityName: getByCityName
}
