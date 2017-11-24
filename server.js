const express = require( 'express' )
const app = express()

app.use( '/', express.static( './public' ) )

app.listen( 8999, () => console.log( 'server is started at 80' ) )