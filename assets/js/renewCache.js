
const loggerRenewCache = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[renewCACHE] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[renewCACHE] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[renewCACHE] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[renewCACHE] [${timestamp}] [DEBUG]`, ...args)
	}
}

const renewEnvVars = async ()=>{
	const envVars = await window.electronAPI.getEnv();
	localStorage.setItem("envVars", JSON.stringify(envVars))
}
const renewAllFiles = async () => {
	loggerRenewCache.info("renewing all files.")
	await fetch(`${window.API_URL}/files/getfiles`, {
		method: 'POST',
		headers: {
			'api-key': `${window.API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const r_dec = decodeURIComponent(await r.text())
		return JSON.parse(r_dec)
	}).then((r_json)=>{
		const filesAsObjects = r_json.map(arr => ({
			weburl: arr[0],
			name: arr[1],
			category: arr[2],
			size: arr[3],
			ftype: arr[4],
			about: arr[5],
			private: arr[6],
			id: arr[7]
		}))
		localStorage.setItem("all_files", JSON.stringify(filesAsObjects))
	})
}
const renewLastActivity = async () => {
	loggerRenewCache.info("renewing last activirt.")
	await fetch(`${window.API_URL}/activity/lastactivies`, {
		method: 'POST',
		headers: {
			'api-key': `${window.API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const j = decodeURIComponent(await r.text())
		const j_json = JSON.parse(j)
		localStorage.setItem("last_activity", JSON.stringify(j_json))
	})
}
const renewAllCategories = async () => {
	loggerRenewCache.info("renewing categories.")
	await fetch(`${window.API_URL}/upload/get_categories`, {
		method: 'POST',
		headers: {
			'api-key': `${window.API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const j = JSON.parse(decodeURIComponent(await r.text()))
		localStorage.setItem("all_categories", JSON.stringify(j))
	})
}

if (!localStorage.getItem("envVars")){
	await renewEnvVars().then(()=>{
		const envVars = JSON.parse(localStorage.getItem("envVars"))
		window.API_URL = envVars.API_URL
		window.API_KEY = envVars.API_KEY
	})
}
if (!localStorage.getItem("all_files")){
	renewAllFiles()
}
if (!localStorage.getItem("last_activity")){
	renewLastActivity()
}
if (!localStorage.getItem("all_categories")){
	renewAllCategories()
}