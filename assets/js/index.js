
const loggerIndex = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[INDEX] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[INDEX] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[INDEX] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[INDEX] [${timestamp}] [DEBUG]`, ...args)
	}
}

document.addEventListener('DOMContentLoaded', async function() {

	const getEnvVars = async ()=>{
		if (!localStorage.getItem("envVars")){
			loggerIndex.info("waiting for envVars")
			await new Promise(resolve => setTimeout(resolve, 750))
			return getEnvVars()
		}
		return JSON.parse(localStorage.getItem("envVars"))
	}
	const envVars = await getEnvVars()
	window.API_URL = envVars.API_URL
	window.API_KEY = envVars.API_KEY
	window.CDN_URL = envVars.CDN_URL


	window.openVLC = async (weburl)=>{
		try {
        const url = window.CDN_URL + weburl;
        const result = await window.electronAPI.openVLC(url);
        document.getElementById('status').textContent = `VLC Status: ${result}`;
      } catch (error) {
        document.getElementById('status').textContent = `VLC Status: ${error}`;
      }
	}
	window.electronAPI.onVLCStatus((status) => {
      const statusDiv = document.getElementById('status')
      if (status.error) {
        statusDiv.textContent = `VLC Status: ${status.error}`
      } else {
		if (status.state === "stopped"){
			statusDiv.textContent = `VLC Status: ${status.state}`
		} else {
			statusDiv.textContent = `VLC Status: ${status.state}, Time: ${status.time}/${status.length}`
		}
      }
    })


	const lastActivityEl = document.querySelector("#lastactivity-content")
	const lastUploadedEl = document.querySelector("#lastuploaded-content")

	const getLastActivity = async () => {
		if (!localStorage.getItem("last_activity")){
			loggerIndex.info("waiting for last_activity")
			await new Promise(resolve => setTimeout(resolve, 750))
			return getLastActivity()
		}
		return JSON.parse(localStorage.getItem("last_activity"))
	}

	const getAllFiles = () => {
		return JSON.parse(localStorage.getItem("all_files")) || []
	}

	const hasNextVideo = (weburl, category) => {
		const allFiles = getAllFiles()
		if (!allFiles || allFiles.length === 0) {
			loggerIndex.info('No files loaded yet')
			return false
		}
		const catToMatch = category.endsWith('/') ? category : category + '/'
		const filesInCategory = allFiles.filter(f => f && f.category === catToMatch)
		const hasNext = filesInCategory.some(f => f.weburl > weburl)
		return hasNext
	}

	const hasPreviousVideo = (weburl, category) => {
		const allFiles = getAllFiles()
		if (!allFiles || allFiles.length === 0) {
			loggerIndex.info('No files loaded yet')
			return false
		}
		const catToMatch = category.endsWith('/') ? category : category + '/'
		const filesInCategory = allFiles.filter(f => f && f.category === catToMatch)
		const hasPrev = filesInCategory.some(f => f.weburl < weburl)
		return hasPrev
	}

	window.finish_file = async (weburl)=>{
		return await fetch(`${window.API_URL}/activity/finish_file`, {
			method: 'POST',
			headers: {
				'api-key': `${window.API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				weburl: weburl
			})
		}).then((r)=>{
			if (r.ok) {
				window.localStorage.removeItem("last_activity")
				window.location.reload()
			} else {
				alert('Error occurred while processing the request')
			}
		})
	}
	window.back_file = async (weburl)=>{
		return await fetch(`${window.API_URL}/activity/back_file`, {
			method: 'POST',
			headers: {
				'api-key': `${window.API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				weburl: weburl
			})
		}).then((r)=>{
			if (r.ok) {
				window.localStorage.removeItem("last_activity")
				window.location.reload()
			} else {
				alert('Error occurred while processing the request')
			}
		})
	}
	window.remove_file = async (weburl)=>{
		return await fetch(`${window.API_URL}/activity/remove_file`, {
			method: 'POST',
			headers: {
				'api-key': `${window.API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				weburl: weburl
			})
		}).then((r)=>{
			if (r.ok) {
				window.localStorage.removeItem("last_activity")
				window.location.reload()
			} else {
				alert('Error occurred while processing the request')
			}
		})
	}

	const populateLastActivity = async ()=>{
		const videos = await getLastActivity()
		var html = ``
		videos.forEach((index)=>{
			const weburl = index[0]
			const name = index[1]
			const about = index[2]
			const catg = index[3]

			const showPrevButton = hasPreviousVideo(weburl, catg)
			const showNextButton = hasNextVideo(weburl, catg)

			html += `
				<div class="flex-shrink-0 w-72 bg-dark-card rounded-lg overflow-hidden hover:bg-dark-hover transition-colors group" style="height: 280px;">
					<div class="relative" style="height: 160px;">
						<img id="lastactivity-images" data-weburl="${weburl}" class="w-full h-full object-cover">
					</div>
					<div class="p-3" style="height: 120px; display: flex; flex-direction: column; position: relative;">
						<a onclick="window.openVLC('${weburl}')" class="text-turkuazz text-sm font-medium block cursor-pointer hover:text-white transition-colors line-clamp-2 flex-shrink-0" title="${name}" style="margin-bottom: 8px;">
							${name}
						</a>
						<div class="absolute bottom-3 left-3 right-3">
							<div class="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">

								<button onclick="window.remove_file('${weburl}')" title="Remove" class="bg-red-500 text-white rounded hover:bg-red-400 transition-colors w-7 h-7 flex items-center justify-center p-0">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
									</svg>
								</button>	
								<div class="flex space-x-2">
									<button onclick="window.location.href='edit.html?weburl=${weburl}'" title="Edit" class="bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors w-7 h-7 flex items-center justify-center p-0">
										<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
											<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
										</svg>
									</button>
									<button onclick="window.location.href='category.html?catg=${catg}'" title="Open category" class="bg-yellow-500 text-black px-2 rounded text-xs font-medium hover:bg-yellow-400 transition-colors h-7 flex items-center justify-center">
										category
									</button>
								</div>
								<div class="flex space-x-2">
									${showPrevButton ? `
									<button onclick="window.back_file('${weburl}')" title="Previous" class="bg-green-500 text-white rounded hover:bg-green-400 transition-colors w-7 h-7 flex items-center justify-center p-0">
										<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
										</svg>
									</button>
									` : ''}
									${showNextButton ? `
									<button onclick="window.finish_file('${weburl}')" title="Next" class="bg-green-500 text-white rounded hover:bg-green-400 transition-colors w-7 h-7 flex items-center justify-center p-0">
										<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
										</svg>
									</button>
									` : ''}
								</div>
							</div>
						</div>
					</div>
				</div>
			`
		})
		lastActivityEl.innerHTML = html
		window.setImages("#lastactivity-images", "still")
	}

	const getLastUploaded = async () => {
		if (!localStorage.getItem("all_files")){
			loggerIndex.info("waiting for all_files")
			await new Promise(resolve => setTimeout(resolve, 750))
			return getLastUploaded()
		}
		const allFiles = JSON.parse(localStorage.getItem("all_files"))
		return allFiles ? allFiles.slice(-15).reverse() : []
	}
	const populateLastUploaded = async ()=>{
		const videos = await getLastUploaded()
		var html = ``
		videos.forEach((file)=>{
			const weburl = file.weburl
			const name = file.name
			const about = file.about
			const catg = file.category
			html += `
				<div class="flex-shrink-0 w-72 bg-dark-card rounded-lg overflow-hidden hover:bg-dark-hover transition-colors group" style="height: 280px;">
					<div class="relative" style="height: 160px;">
						<img id="lastuploaded-images" data-weburl="${weburl}" class="w-full h-full object-cover">
					</div>
					<div class="p-3" style="height: 120px; display: flex; flex-direction: column; position: relative;">
						<a onclick="window.openVLC('${weburl}')" class="text-turkuazz text-sm font-medium block cursor-pointer hover:text-white transition-colors line-clamp-2 flex-shrink-0" title="${name}" style="margin-bottom: 8px;">
							${name}
						</a>
						<div class="absolute bottom-3 left-3 right-3">
							<div class="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
								<button onclick="window.location.href='edit.html?weburl=${weburl}'" title="Edit" class="bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors w-7 h-7 flex items-center justify-center p-0">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
									</svg>
								</button>
								<button onclick="window.location.href='category.html?catg=${catg}'" title="Open category" class="bg-yellow-500 text-black px-2 rounded text-xs font-medium hover:bg-yellow-400 transition-colors h-7 flex items-center justify-center">
									category
								</button>
							</div>
						</div>
					</div>
				</div>
			`
		})
		lastUploadedEl.innerHTML = html
		window.setImages("#lastuploaded-images", "still")
	}

	populateLastActivity()
	populateLastUploaded()
})