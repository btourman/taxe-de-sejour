global.fetch = require("node-fetch")
const wretch = require('wretch')

const transformResultToJson = (result) => {
    const [city, rest] = result.split('(')
    const [zipCode, insee] = rest.split(')')[0].split(' - ')
    return {
        city: city,
        zipCode: zipCode.split('CP ')[1],
        insee: insee.split('INSEE ')[1]
    }
}

const getByCityName = (city) => {
    return wretch('http://taxesejour.impots.gouv.fr/DTS_WEB/FR/index.awp')
        .formUrl({
            WD_ACTION_: 'AJAXEXECUTE',
            EXECUTEPROC: 'GlobalesDTS.SaisieAssistée',
            WD_CONTEXTE_: 'A4',
            PA1: city
        })
        .post()
        .text(text => {
            return text.split('\r\n').map(t => transformResultToJson(t))
        })
}

module.exports = {
    getByCityName: getByCityName
}
