tailwind.config = {
    theme: {
        extend: {
            colors: {
                'turkuazz': '#00d4aa',
                'dark-bg': '#1a1a1a',
                'dark-card': '#2a2a2a',
                'dark-hover': '#3a3a3a'
            }
        }
    }
}
const loggerHeader = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[HEADER] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[HEADER] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[HEADER] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[HEADER] [${timestamp}] [DEBUG]`, ...args)
	}
}

function handleHeaderSearch(event) {
    event.preventDefault()
    const searchInput = document.getElementById('headerSearchInput')
    const query = searchInput.value.trim()
    
    if (query) {
        window.location.href = `search.html?query=${encodeURIComponent(query)}`
    }
    return false
}

window.fetchImage = async (weburl, type) => {
    return await fetch(`${window.API_URL}/getimage?weburl=${weburl}&type=${type}&api-key=${window.API_KEY}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(async (r) => {
        if (r.ok) {
            const blob = await r.blob()
            const reader = new FileReader()
            return new Promise((resolve) => {
                reader.onloadend = () => {
                    const base64String = reader.result
                    localStorage.setItem(`i${weburl}${type}`, base64String)
                    resolve(base64String)
                }
                reader.readAsDataURL(blob)
            })
        } else {
            loggerHeader.error('Failed to fetch image')
            return null
        }
    })
}

window.createSpinner = function(color = 0) {
    const spinner = document.createElement("div");
    spinner.classList.add("spinner-element");
    spinner.style.position = "absolute";
    spinner.style.top = "50%";
    spinner.style.left = "50%";
    spinner.style.marginLeft = "-25px";
    spinner.style.marginTop = "-25px";
    spinner.style.display = "flex";
    spinner.style.width = "50px";
    spinner.style.height = "50px";
    spinner.style.border = "4px solid rgba(255, 255, 255, 0.5)";
    spinner.style.borderTop = "4px solid white";
    spinner.style.borderRadius = "50%";
    spinner.style.animation = "spin 1s linear infinite";
    spinner.style.zIndex = "10";
    if (color == 1) {
        spinner.style.border = "4px solid rgba(0, 0, 0, 0.5)";
        spinner.style.borderTop = "4px solid black";
        spinner.style.borderRadius = "50%";
        spinner.style.color = "black";
    }
    return spinner;
}

window.setImage = async (weburl, element, type) => {
    element.style.visibility = "hidden"
    const spinner = window.createSpinner()
    const container = element.parentElement
    
    const existingSpinner = container.querySelector('.spinner-element')
    if (existingSpinner) {
        container.removeChild(existingSpinner)
    }
    
    container.appendChild(spinner)
    
    if (sessionStorage.getItem(`i${weburl}${type}`)) {
        const cachedUrl = sessionStorage.getItem(`i${weburl}${type}`)
        if (cachedUrl) {
            element.src = cachedUrl
            element.onerror = async () => {
                sessionStorage.removeItem(`i${weburl}${type}`)
                const base64String = await window.fetchImage(weburl, type)
                if (base64String) {
                    element.src = base64String
                }
            }
        }
    } else if (localStorage.getItem(`i${weburl}${type}`)) {
        const cachedBase64 = localStorage.getItem(`i${weburl}${type}`)
        element.src = cachedBase64
    } else {
        const base64String = await window.fetchImage(weburl, type)
        if (base64String) {
            element.src = base64String
        }
    }
    
    element.onload = () => {
        if (spinner && spinner.parentNode === container) {
            container.removeChild(spinner)
        }
        element.style.visibility = "visible"
    }
}

window.setImages = (selector, type) => {
    document.querySelectorAll(selector).forEach(async (i) => {
        const weburl = i.dataset.weburl
        await window.setImage(weburl, i, type)
        i.parentElement.addEventListener('mouseenter', async function() {
            await window.setImage(weburl, i, "gif")
        })
        i.parentElement.addEventListener('mouseleave', async function() {
            await window.setImage(weburl, i, "still")
        })
    })
}

document.addEventListener("DOMContentLoaded", async ()=>{
    const getEnvVars = async () => {
        if (!localStorage.getItem("envVars")) {
            loggerHeader.info("waiting for envVars")
            await new Promise(resolve => setTimeout(resolve, 750))
            return getEnvVars()
        }
        return JSON.parse(localStorage.getItem("envVars"))
    }
    
    const envVars = await getEnvVars()
    window.API_URL = envVars.API_URL
    window.API_KEY = envVars.API_KEY
    window.CDN_URL = envVars.CDN_URL
    
	const headerEl = document.querySelector("header")
	
	const makeheader = ()=>{
        headerEl.classList = "bg-dark-bg border-b border-gray-700 px-6 py-4"
		headerEl.innerHTML = `
		<div class="flex items-center justify-between">
            <!-- Left side buttons -->
            <div class="flex space-x-4">
                <button class="text-turkuazz hover:text-white transition-colors font-medium">UPLOAD</button>
                <button class="text-turkuazz hover:text-white transition-colors font-medium">DOWNLOAD</button>
            </div>
            
            <!-- Center logo -->
            <div class="flex items-center space-x-2 cursor-pointer" onclick="window.location.href='index.html'">
                <div class="w-8 h-8 bg-turkuazz rounded flex items-center justify-center">
                    <span class="text-dark-bg font-bold text-sm">T</span>
                </div>
                <span class="text-turkuazz font-bold text-xl">TURKUAZZ</span>
            </div>
            
            <!-- Right side -->
            <div class="flex items-center space-x-4">
                <div class="relative group">
                    <button class="text-turkuazz hover:text-white transition-colors font-medium">EDIT</button>
                    <div class="absolute right-0 mt-1 w-48 bg-dark-card border border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <a href="edit.html" class="block px-4 py-2 text-sm text-white hover:bg-dark-hover rounded-t-lg">Edit Videos</a>
                        <a href="category-edit.html" class="block px-4 py-2 text-sm text-white hover:bg-dark-hover rounded-b-lg">Edit Categories</a>
                    </div>
                </div>
                <form id="headerSearchForm" class="flex items-center space-x-2" onsubmit="return handleHeaderSearch(event)">
                    <input id="headerSearchInput" type="text" placeholder="Search..." class="bg-dark-card border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-turkuazz">
                  
                    <button type="submit" class="text-turkuazz hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </button>

                    <button type="button" onclick="window.localStorage.clear();window.location.reload();" class="text-turkuazz hover:text-white transition-colors ml-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
		`
	}
	makeheader()
	
	setImages("header img[data-weburl]", "still")
})