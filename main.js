const { app, BrowserWindow, ipcMain } = require('electron/main')
const { spawn } = require('child_process')
const axios = require('axios')
const path = require('node:path')
const fs = require('node:fs')
const dotenv = require('dotenv')

const logger = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[${timestamp}] [DEBUG]`, ...args)
	}
}

let vlcConfig = {}
try {
	const configPath = path.join(__dirname, 'config', 'config.json')
	const configData = fs.readFileSync(configPath, 'utf8')
	vlcConfig = JSON.parse(configData)
} catch (error) {
	logger.error('Failed to load VLC config:', error.message)
	app.exit(1)
}

const VLC_PATH = vlcConfig.VLC_PATH
const VLC_PORT = vlcConfig.VLC_PORT
const VLC_HTTP_PASS = vlcConfig.VLC_HTTP_PASS

dotenv.config(".env")

ipcMain.handle('get-env', () => {
	return {
		"API_KEY": process.env.API_KEY,
		"API_URL": process.env.API_URL,
		"CDN_URL": process.env.CDN_URL
	}
})

let mainWindow
let vlcMonitoringInterval = null
let currentlyMonitoringWeburl = null
let isMonitoring = false
let vlcProcess = null



const createWindow = () => {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js')
		}
	})
	
	mainWindow = win
	win.loadFile(path.join(__dirname, 'views/index.html'))
	// win.webContents.openDevTools()
}

const getVLCStatus = async () => {
	try {
		const response = await axios.get(
			`http://127.0.0.1:${VLC_PORT}/requests/status.json`,
			{
				auth: { username: '', password: VLC_HTTP_PASS },
				timeout: 1000
			}
		)
		const data = response.data
		const state = data.state
		const duration = data.length
		const position = data.position
		const currentTime = Math.floor(duration * position)
		
		return { state, duration, currentTime, position }
	} catch (error) {
		return null
	}
}

const seekVLC = async (seconds) => {
	try {
		await axios.get(
			`http://127.0.0.1:${VLC_PORT}/requests/status.xml`,
			{
				auth: { username: '', password: VLC_HTTP_PASS },
				params: { command: 'seek', val: String(seconds) },
				timeout: 1000
			}
		)
		return true
	} catch (error) {
		logger.error('Seek failed:', error.message)
		return false
	}
}

const updateActivitySec = async (weburl, current, state) => {
	try {
		const response = await axios.post(
			`${process.env.API_URL}/activity/updatesec`,
			{ weburl, current, state },
			{
				headers: { 'api-key': process.env.API_KEY },
				timeout: 5000
			}
		)
		return response.data === 'ok'
	} catch (error) {
		logger.error('Failed to update activity:', error.message)
		return false
	}
}

const finishActivity = async (weburl) => {
	try {
		const response = await axios.post(
			`${process.env.API_URL}/activity/updatesec`,
			{ weburl, finished: 1 },
			{
				headers: { 'api-key': process.env.API_KEY },
				timeout: 5000
			}
		)
		return response.data === 'ok'
	} catch (error) {
		logger.error('Failed to finish activity:', error.message)
		return false
	}
}

const stopVLCMonitoring = () => {
	if (vlcMonitoringInterval) {
		clearInterval(vlcMonitoringInterval)
		vlcMonitoringInterval = null
	}
	isMonitoring = false
	currentlyMonitoringWeburl = null
	logger.log('VLC monitoring stopped')
	
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send('vlc-status', {
			state: 'stopped',
			time: 0,
			length: 0
		})
	}
}

const abortVLC = () => {
	try{
		stopVLCMonitoring()
	} catch{
		logger.error("could not stop vlc monitoring.")
	}
	
	if (vlcProcess && !vlcProcess.killed) {
		try {
			process.kill(vlcProcess.pid, 'SIGTERM')
			logger.log('VLC process terminated, PID:', vlcProcess.pid)
			vlcProcess = null
		} catch (error) {
			logger.error('Failed to kill VLC process:', error.message)
		}
	}
}

const startVLCMonitoring = async (weburl, startTime) => {
	if (isMonitoring) {
		logger.log('Already monitoring VLC, stopping previous monitoring')
		abortVLC()
	}

	isMonitoring = true
	currentlyMonitoringWeburl = weburl
	logger.log('Starting VLC monitoring for:', weburl, 'startTime:', startTime)

	let currentState = null
	let currentTime = 0
	let duration = 0
	let lastUpdateTime = 0
	let failureCount = 0
	const MAX_FAILURES = 40

	let seekRetries = 0
	const waitForDuration = setInterval(async () => {
		const status = await getVLCStatus()
		if (status && status.duration > 0) {
			clearInterval(waitForDuration)
			duration = status.duration
			logger.log(`VLC ready, duration: ${duration}`)

			if (startTime > 0) {
				const seekSuccess = await seekVLC(startTime)
				if (seekSuccess) {3
					logger.log(`Seeked to ${startTime}`)
				}
				await updateActivitySec(weburl, startTime, 'starting')
			} else {
				await updateActivitySec(weburl, 0, 'starting')
			}
		} else {
			seekRetries++
			if (seekRetries > 40) {
				clearInterval(waitForDuration)
				logger.error('Failed to get VLC duration, aborting monitoring')
				abortVLC()
			}
		}
	}, 250)

	vlcMonitoringInterval = setInterval(async () => {
		const status = await getVLCStatus()

		if (!status) {
			failureCount++
			logger.log(`VLC status check failed (${failureCount}/${MAX_FAILURES})`)
			
			if (failureCount >= MAX_FAILURES) {
				logger.log('VLC appears to have stopped')
				stopVLCMonitoring()
			}
			return
		}

		failureCount = 0

		if (status.duration !== duration && status.duration > 0) {
			duration = status.duration
		}

		const state = status.state
		const ttime = status.currentTime

		if (state === 'stopped') {
			logger.log(`${currentTime}/${duration}, VLC stopped`)
			stopVLCMonitoring()
			return
		}

		const now = Date.now()
		const shouldUpdate = now - lastUpdateTime > 5000

		if (shouldUpdate && ttime > 0) {
			lastUpdateTime = now
			await updateActivitySec(weburl, ttime, 'update_time')
		}

		if (currentState !== state || currentTime !== ttime) {
			if (ttime >= duration && duration > 0 && ttime > 0) {
				logger.log('Video finished')
				abortVLC()
				return
			} else if (state !== currentState) {
				await updateActivitySec(weburl, ttime, state)
			}

			currentState = state
			if (state !== 'ended') {
				currentTime = ttime
			}
			logger.log(`${currentTime}/${duration}, ${currentState}`)
			
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send('vlc-status', {
					state: currentState,
					time: currentTime,
					length: duration
				})
			}
		}
	}, 250)
}


ipcMain.handle('open-vlc', async (event, url) => {
	const weburl = url.replace(process.env.CDN_URL, '')
	
	let currentsec = 0
	try {
		const response = await axios.post(
			`${process.env.API_URL}/activity/currentsec`,
			{ weburl },
			{
				headers: { 'api-key': process.env.API_KEY },
				timeout: 5000
			}
		)
		currentsec = parseInt(response.data) || 0
		logger.log('Fetched currentsec from server:', currentsec)
	} catch (error) {
		logger.error('Failed to fetch currentsec, starting from 0:', error.message)
	}
	
	if (vlcProcess && !vlcProcess.killed) {
		logger.log('VLC already running, aborting previous instance')
		abortVLC()
		await new Promise(resolve => setTimeout(resolve, 500))
	}

	vlcProcess = spawn(VLC_PATH, [
		'--intf', 'qt',
		'--extraintf', 'http',
		"--video-on-top",
		'--http-port', String(VLC_PORT),
		'--http-password', VLC_HTTP_PASS,
		"--avcodec-hw", "none",
		'--start-time', String(currentsec),
		url
	], { detached: false })

	logger.log('VLC launched with PID:', vlcProcess.pid)

	vlcProcess.on('exit', (code) => {
		logger.log('VLC exited with code:', code)
		stopVLCMonitoring()
		vlcProcess = null
	})

	vlcProcess.on('error', (error) => {
		logger.error('VLC process error:', error)
		stopVLCMonitoring()
		vlcProcess = null
	})

	setTimeout(() => {
		startVLCMonitoring(weburl, currentsec)
	}, 1000)

	return 'VLC launched'
})

app.whenReady().then(() => {
	createWindow()
})

app.on('window-all-closed', () => {
	abortVLC()
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('before-quit', () => {
	abortVLC()
})