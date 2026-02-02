
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

let envCache = null

const getEnv = async () => {
    if (envCache) return envCache

    try {
        const envVars = await window.electronAPI.getEnv()
        if (!envVars?.API_URL || !envVars?.API_KEY) {
            throw new Error('env variables are missing')
        }
        
        envCache = envVars
        localStorage.setItem('envVars', JSON.stringify(envVars))
        return envCache
    } catch (e) {
        loggerRenewCache.error('could not get environment variables:', e)
        const cachedEnv = localStorage.getItem('envVars')
        if (cachedEnv) {
            envCache = JSON.parse(cachedEnv)
            return envCache
        }
        throw e
    }
}

const renewAllFiles = async () => {
	loggerRenewCache.info("renewing all files.")
	const { API_URL, API_KEY } = await getEnv()
	
	await fetch(`${API_URL}/files/getfiles`, {
		method: 'POST',
		headers: {
			'api-key': `${API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const r_dec = await r.text()
		return JSON.parse(r_dec)
	}).then((r_json)=>{
		const filesAsObjects = r_json.map(arr => ({
			weburl: arr[0],
			name: decodeURIComponent(arr[1]),
			category: decodeURIComponent(arr[2]),
			size: arr[3],
			ftype: arr[4],
			about: decodeURIComponent(arr[5]),
			private: arr[6],
			id: arr[7]
		}))
		localStorage.setItem("all_files", JSON.stringify(filesAsObjects))
	})
}
const renewLastActivity = async () => {
	loggerRenewCache.info("renewing last activity.")
	const { API_URL, API_KEY } = await getEnv()
	
	await fetch(`${API_URL}/activity/lastactivies`, {
		method: 'POST',
		headers: {
			'api-key': `${API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const t = await r.text()
		const j = JSON.parse(t)
		// decode all elements in j[i] (j[i][0], j[i][1], etc.)
		for (let i = 0; i < j.length; i++) {
			for (let k = 0; k < j[i].length; k++) {
				if (typeof j[i][k] === 'string') {
					j[i][k] = decodeURIComponent(j[i][k])
				}
			}
		}

		localStorage.setItem("last_activity", JSON.stringify(j))
	})
}
const renewAllCategories = async () => {
	loggerRenewCache.info("renewing categories.")
	const { API_URL, API_KEY } = await getEnv()
	
	await fetch(`${API_URL}/upload/get_categories`, {
		method: 'POST',
		headers: {
			'api-key': `${API_KEY}`,
			'Content-Type': 'application/json'
		}
	}).then(async (r)=>{
		const j = JSON.parse(decodeURIComponent(await r.text()))
		loggerRenewCache.debug("typeof j", typeof j)
		localStorage.setItem("all_categories", JSON.stringify(j))
	})
}


if (!localStorage.getItem("all_files")) {
	renewAllFiles()
}
if (!localStorage.getItem("last_activity")) {
	renewLastActivity()
}
if (!localStorage.getItem("all_categories")) {
	renewAllCategories()
}