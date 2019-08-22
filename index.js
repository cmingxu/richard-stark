/* eslint-disable no-console */
import puppeteer, { launch } from 'puppeteer'
import connect from 'connect'
import http from 'http'
import process from 'process'
import fs from 'fs'

let proxyServer = null
// default browser instance
let browser = null

// launch options here
let options = {
	ignoreHTTPSErrors: true,
	headless: true,
	userDataDir: './chromeData',
	args: ['--no-sandbox', '--disable-plugins', '--disable-plugins-discovery']
}

// setup proxy
if (proxyServer != null) {
	options.args.push('--proxy-server=${proxyServer}')
}

// start the browser
async function start() {
	try {
		browser = await puppeteer.launch({ args: ['--no-sandbox'] })
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(e)
	}
}

// stop browser
async function stop() {
	if (browser != null) {
		browser.close()
		browser = null
	}
}

// get page and store it optionally
async function getPage(options = {}) {
	try {
		const page = await browser.newPage()

		if(options.disableJS){
			await page.setJavaScriptEnabled(false)
		}
		if(options.userAgent){
			await page.setUserAgent(options.UserAgent)
		}
		if(options.timeout){
			await page.setDefaultNavigationTimeout(options.Timeout)
		}
		if(options.debug){
			page.on('response', (resp) => {
				console.log(resp.status())
				console.log(resp.headers())
			})
		}

		await page.goto('https://www.haozu.com/bj/house1378083/')
		let content = await page.content()

		if(options.debug){
			console.log(content)
		}

		// persist the content
		if(options.cachedPath) {
			let size = fs.writeFileSync(options.cachedPath, content)
			console.log(size)
		}
    
		// cleanup process
		await page.close()
	} catch (e) {
		console.error(e)
	}
}

// start scrap proxy server and register valid routes handler
let app = connect()
app.use((req, res) => {
	if (req.path.toLowerCase() == '/start') {
		start()
		res.end('start browser')
		return
	}
  
	if (req.path.toLowerCase() == '/stop'){
		stop()
		res.end('stop browser')
		return
	}
  
  
	console.log(req.headers)
	let getPageOptions = Object.create({})
	getPage(getPageOptions)
	res.end('end')
})

// launch browser by default
launch()

process.on('uncaughtException', () => {
	stop()
})
process.on('SIGABRT', stop)
process.on('SIGINT', stop)
process.on('exit', () => {
	console.log('exiting...')
})

const port = process.env.PORT || 3000
console.log('scrap server start listening on port', port)
http.createServer(app).listen(port)
