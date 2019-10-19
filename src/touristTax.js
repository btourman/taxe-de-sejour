global.fetch = require("node-fetch")
const fs = require('fs')
const parseString = require('xml2js').parseStringPromise;
const wretch = require('wretch')
const { addHours, parse, setYear, isSameDay, isWithinInterval } = require('date-fns')
const fr = require('date-fns/locale/fr')

const taxes = fs.readFileSync(__dirname + '/../resources/taxe_sejour_20190527.xml')
let preformatTaxes = []

const xmlToPreformat = (() => {
    parseString(taxes)
        .then(result => {
            const deliberations = result.deliberations.deliberation.map(deliberation => {
                const collectiviteSiren = deliberation.collectivites[0].collectivite ? deliberation.collectivites[0].collectivite.map(c => c.$.siren) : []
                const siren = [deliberation.saisie[0].collectiviteDeliberante[0].$.siren].concat(collectiviteSiren)
                const hasDepartementalRate = deliberation.taxeAdditionnelleDepartementale[0]
                const limit = parseFloat(deliberation.loyerMaximumNuit[0])

                return {
                    siren,
                    hasDeptRate: hasDepartementalRate === 'true',
                    limit,
                    phases: deliberation.periodes[0].periode

                }
            })
            preformatTaxes = deliberations
        })
})()

const highLimit = 2.3

const departementalRate = 10

const roundFloat = (number) => Math.round(number * 100) / 100

const getPhases = (insee, category) => {
    return wretch(`https://public.opendatasoft.com/api/records/1.0/search/?dataset=banatic-siren-insee-2017&facet=reg_com&facet=dep_com&facet=insee&refine.insee=${insee}`)
        .get()
        .json(json => {
            const siren = json.records[0].fields.siren
            const deliberation = preformatTaxes.find(d => d.siren.includes(siren))
            const hasDeptRate = deliberation.hasDeptRate
            const limit = deliberation.limit

            const phases = deliberation.phases.map(periode => {
                return ({
                    start: setYear(addHours(parse(periode.dateDebut[0].toLowerCase(), 'd MMMM', new Date(), { locale: fr }), 2), new Date().getFullYear()),
                    end: setYear(addHours(parse(periode.dateFin[0].toLowerCase(), 'd MMMM', new Date(), { locale: fr }), 2), new Date().getFullYear()),
                    rate: parseFloat(periode.tarifs[0].tarif.find(t => t.$.categorieId == category)._),
                    isPercent: category == '19',
                    hasDeptRate: hasDeptRate,
                    maximumRent: limit
                })
            })

            return phases
        })
}

const isBetween = (date, from, to) => {
    try {
        return isSameDay(date, from) || isSameDay(date, to) || isWithinInterval(date, { start: from, end: to })
    }
    catch (error) {
        console.error(error)
        return false
    }
}

const calculateTouristTax = (numberOfNights, numberOfTravelers, adults, limit, price, phase) => {
    if (phase.isPercent) {
        const touristTaxPerPerson = (price / numberOfTravelers) * (phase.rate / 100)

        const cappedTouristTax = touristTaxPerPerson > limit ? limit : touristTaxPerPerson

        const communalShare = (cappedTouristTax * numberOfNights * adults)

        return roundFloat(phase.hasDeptRate ? communalShare * (1 + (departementalRate / 100)) : communalShare)

    } else {
        return roundFloat(numberOfNights * adults * phase.rate)
    }
}

const calculate = (nights, numberOfTraveler, adults, price, insee, checkin, category) => {
    return getPhases(insee, category)
        .then(phases => {
            const phase = phases.find(phase => isBetween(checkin, phase.start, phase.end))

            if (phase) {
                const calculateLimit = !phase.maximumRent ? highLimit : (phase.maximumRent > highLimit ? highLimit : phase.maximumRent)

                return calculateTouristTax(nights, numberOfTraveler, adults, calculateLimit, price, phase)
            }
            return 0
        })
}

module.exports = {
    calculate: calculate,
    getPhases: getPhases
}
