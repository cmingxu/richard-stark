/* eslint-disable no-console */
import 'babel-polyfill'

import puppeteer from 'puppeteer'
import express from 'express'
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
		browser = await puppeteer.launch({
			args: ['--no-sandbox']
		})
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

		if (options.disableJS) {
			await page.setJavaScriptEnabled(false)
		}
		if (options.userAgent) {
			await page.setUserAgent(options.userAgent)
		}
		if (options.timeout) {
			await page.setDefaultNavigationTimeout(options.Timeout)
		}
		if (options.debug) {
			page.on('response', (resp) => {
				console.log(resp.status())
				console.log(resp.headers())
			})
		}

		await page.goto('https://www.haozu.com/bj/house1378083/')
		let content = await page.content()

		if (options.debug) {
			console.log(content)
		}
		// persist the content
		if (options.cachedPath) {
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
let app = express()
app.get('/start', (req, res) => {
	console.log(res.path)
	start()
	res.end('start browser')
})

app.get('/stop', (req, res) => {
	console.log(res.path)
	stop()
	res.end('stop browser')
})


app.use((req, res) => {
	if (req.headers['proxyrequest']) {
		// no browser initialized
		if (browser == null) {
			res.end('no browser')
			return
		}

		let getPageOptions = Object.create({
			debug: true,
			host: req.headers['request-host'],
			path: req.path,
			timeout: 10,
			userAgent: req.headers['user-agent'],
			cachedPath: '/tmp/content'
		})

		if(req.headers['no-debug']) {
			getPageOptions.debug = false
		}

		if(req.headers['timeout']) {
			getPageOptions.timeout = 5
		}

		if(req.headers['cached-path']){
			getPageOptions.cachedPath = req.headers['cached-path']
		}

		getPage(getPageOptions)
		res.end('end')
		return
	}

	res.end('not valid request')
})

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