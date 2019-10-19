const { parseISO } = require('date-fns')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const { getByCityName } = require('./insee')
const { getPhases, calculate } = require('./touristTax')

const CalculateValidator = require('./CalculateValidator').default
const { validate } = require('./Validator')

app.use(bodyParser.json())

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Credentials,Authorization, Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.get('/cities', ({ query }, res) => {
    const cityName = query.name
    if (cityName) {
        getByCityName(cityName)
            .then(results => res.send(results))
            .catch(err => {
                console.error(err)
                res.status(500).send(err)
            })
    } else {
        res.sendStatus(400)
    }

})

app.get('/phases', ({ query }, res) => {
    const [insee, category] = [query.insee, query.category]
    if (insee && category) {
        getPhases(insee, category)
            .then(results => res.send(results))
            .catch(err => {
                console.error(err)
                res.status(500).send(err)
            })
    } else {
        res.sendStatus(400)
    }
})

app.post('/calculate', (req, res) => {
    const calculator = req.body
    if (validate(CalculateValidator, calculator)) {
        calculate(calculator.nights, calculator.numberOfTravelers, calculator.adults, calculator.price,
            calculator.insee, parseISO(calculator.checkin), calculator.category)
            .then(touristTax => res.send({
                touristTax
            }))
    } else {
        res.sendStatus(400)
    }

})

const port = process.env.PORT
console.log(port)

if (process.env.NODE_ENV === 'development') {
    app.listen(port, () => {
        console.log('Lstening on port ' + port + '!')
    })
} else {
    const domain = process.env.DOMAIN
    const options = {
        cert: fs.readFileSync('/etc/letsencrypt/live/' + domain + '/fullchain.pem'),
        key: fs.readFileSync('/etc/letsencrypt/live/' + domain + '/privkey.pem')
    }

    https.createServer(options, app).listen(port)
}





