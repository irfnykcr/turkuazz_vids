
const loggerCategory = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[CATEGORY] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[CATEGORY] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[CATEGORY] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[CATEGORY] [${timestamp}] [DEBUG]`, ...args)
	}
}
document.addEventListener('DOMContentLoaded', async function() {
    const getEnvVars = async ()=>{
        if (!localStorage.getItem("envVars")){
            loggerCategory.info("waiting for envVars")
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
            const currentsec = 0;
            const result = await window.electronAPI.openVLC(url, currentsec);
            loggerCategory.info('VLC opened:', result);
        } catch (error) {
            loggerCategory.error('VLC error:', error);
        }
    }

    const fetchCategoryImage = async (category)=>{
        return await fetch(`${window.API_URL}/getimage?category=${category}&api-key=${window.API_KEY}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        }).then(async (r)=>{
            if (r.ok) {
                const blob = await r.blob()
                const blobTempURL = URL.createObjectURL(blob)
                sessionStorage.setItem(`cat${category}`, blobTempURL)
                return blobTempURL
            } else {
                return null
            }
        })
    }
	
    let currentCategory = ''
    let allVideos = []
    let filteredVideos = []
    let currentPage = 1
    const videosPerPage = 12
    let currentSort = 'name'

    const videosGrid = document.getElementById('videosGrid')
    const breadcrumb = document.getElementById('breadcrumb')
    const emptyState = document.getElementById('emptyState')
    const loadingState = document.getElementById('loadingState')
    const sortSelect = document.getElementById('sortSelect')
    const pagination = document.getElementById('pagination')
    const pageInfo = document.getElementById('pageInfo')
    const prevPageBtn = document.getElementById('prevPage')
    const nextPageBtn = document.getElementById('nextPage')
    const subCategoriesSection = document.getElementById('subCategoriesSection')
    const subCategoriesGrid = document.getElementById('subCategoriesGrid')


    const urlParams = new URLSearchParams(window.location.search)
    const categoryParam = urlParams.get('catg')
    let weburlParam = urlParams.get('weburl')
    
    if (!categoryParam) {
        window.location.href = 'index.html'
    } else {
        currentCategory = categoryParam
        initializePage()
    }

    async function initializePage() {
        try {
            loadingState.classList.remove('hidden')
            emptyState.classList.add('hidden')
            videosGrid.innerHTML = ''

            while (!localStorage.getItem("all_files") || !localStorage.getItem("all_categories")) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            const all_catgs = JSON.parse(localStorage.getItem("all_categories"))
            let theCurrentcatg
            const parts = categoryParam.split("/").filter(r => r !== "")
            loggerCategory.info('Category parts:', parts)
            for (const part of parts) {
                loggerCategory.info('Processing part:', part)
                if (theCurrentcatg !== undefined) {
                    theCurrentcatg = theCurrentcatg[part]
                } else {
                    theCurrentcatg = all_catgs[part]
                }
                if (!theCurrentcatg) break
            }
            loggerCategory.info('Current category object:', theCurrentcatg)
            const subCategories = (theCurrentcatg && typeof theCurrentcatg === 'object') ? Object.keys(theCurrentcatg) : []
            
            loggerCategory.info('Subcategories:', subCategories)
            
            updateBreadcrumb()
            renderSubCategories(subCategories)

            const allFiles = JSON.parse(localStorage.getItem("all_files"))
            loggerCategory.info('All files loaded:', allFiles ? allFiles.length : 0)
            loggerCategory.info('Current category:', currentCategory)
            
            const categoryToMatch = currentCategory.endsWith('/') ? currentCategory : currentCategory + '/'
            loggerCategory.info('Category to match:', categoryToMatch)
            
            allVideos = allFiles.filter(file => 
                file && file.category && file.category === categoryToMatch
            )
            
            loggerCategory.info('Filtered videos:', allVideos.length, allVideos.slice(0, 3))
            
            filteredVideos = [...allVideos]
            
            loadingState.classList.add('hidden')
            
            const hasContent = subCategories.length > 0 || allVideos.length > 0
            
            loggerCategory.info('Has content:', hasContent, 'subCategories:', subCategories.length, 'videos:', allVideos.length)
            
            if (!hasContent) {
                emptyState.classList.remove('hidden')
            } else {
                emptyState.classList.add('hidden')
                if (allVideos.length > 0) {
                    loggerCategory.info('Rendering videos...')
                    
                    if (weburlParam) {
                        const targetVideo = allVideos.find(video => video.weburl == weburlParam)
                        if (targetVideo) {
                            const targetIndex = allVideos.indexOf(targetVideo)
                            currentPage = Math.ceil((targetIndex + 1) / videosPerPage)
                        }
                    }
                    
                    sortVideos()
                    renderVideos()
                    updatePagination()
                }
            }
        } catch (error) {
            loggerCategory.error('Error loading category data:', error)
            loadingState.classList.add('hidden')
            emptyState.classList.remove('hidden')
        }
    }

    function renderSubCategories(subCategories) {
        loggerCategory.info('Rendering subcategories:', subCategories)
        if (!subCategories || subCategories.length === 0) {
            subCategoriesSection.classList.add('hidden')
            return
        }

        subCategoriesSection.classList.remove('hidden')

        const subCategoriesHTML = subCategories.map(category => {
            const categoryPath = currentCategory.endsWith('/') 
                ? `${currentCategory}${category}/` 
                : `${currentCategory}/${category}/`
            return `
            <div class="folder-card relative group cursor-pointer" onclick="window.location.href = 'category.html?catg=${categoryPath}'">
                <div class="bg-dark-card hover:bg-dark-hover transition-colors rounded-lg p-4 border border-gray-600 hover:border-turkuazz">
                    <div class="flex flex-col items-center text-center">
                        <div class="mb-3 relative" style="width: 100px; height: 100px;">
                            <img class="category-img" data-category="${categoryPath}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; visibility: hidden;" />
                            <svg class="folder-icon w-12 h-12 text-turkuazz group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                            </svg>
                        </div>
                        <span class="text-sm text-gray-300 group-hover:text-white transition-colors truncate w-full" title="${category}">
                            ${category}
                        </span>
                    </div>
                </div>
            </div>
        `}).join('')

        subCategoriesGrid.innerHTML = subCategoriesHTML
        
        document.querySelectorAll('.category-img').forEach(async (img) => {
            const category = img.dataset.category
            const cached = sessionStorage.getItem(`cat${category}`)
            let blobURL = cached
            
            if (!cached) {
                blobURL = await fetchCategoryImage(category)
            }
            
            if (blobURL) {
                img.src = blobURL
                img.onerror = async () => {
                    loggerCategory.warn('Image load failed for category:', category, 're-caching...')
                    const newBlobURL = await fetchCategoryImage(category)
                    if (newBlobURL) {
                        img.src = newBlobURL
                    }
                }
                img.style.visibility = 'visible'
                img.parentElement.querySelector('.folder-icon').style.display = 'none'
            }
        })
    }

    function updateBreadcrumb() {
        const pathSegments = currentCategory.split('/').filter(segment => segment)
        let breadcrumbHTML = ''
        let currentPath = ''
        
        pathSegments.forEach((segment, index) => {
            currentPath += (currentPath ? '/' : '') + segment
            const isLast = index === pathSegments.length - 1
            
            if (isLast) {
                breadcrumbHTML += `<span class="text-white">${segment}</span>`
            } else {
                breadcrumbHTML += `<a href="?catg=${currentPath}" class="hover:text-white transition-colors">${segment}</a> <span class="text-gray-500">/</span> `
            }
        })
        
        breadcrumb.innerHTML = breadcrumbHTML
    }

    function sortVideos() {
        filteredVideos.sort((a, b) => {
            switch (currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name)
                case 'date':
                    return new Date(b.weburl) - new Date(a.weburl)
                case 'size':
                    // "1.5 GB"
                    const aSize = parseFloat(a.size)
                    const bSize = parseFloat(b.size)
                    return bSize - aSize
                default:
                    return 0
            }
        })
    }

    function renderVideos() {
        const startIndex = (currentPage - 1) * videosPerPage
        const endIndex = startIndex + videosPerPage
        const videosToShow = filteredVideos.slice(startIndex, endIndex)

        if (videosToShow.length === 0) {
            videosGrid.innerHTML = ''
            return
        }

        emptyState.classList.add('hidden')
        
        const videosHTML = videosToShow.map(video => `
            <div class="video-card relative group" data-video-id="${video.weburl}">
                <div class="relative">
                    <img id="category-video-images" data-weburl="${video.weburl}"
                         alt="${video.name}" 
                         class="video-thumbnail w-full h-48 object-cover rounded-lg"
                         data-gif="">
                    <div class="hover-controls absolute inset-0 flex items-center justify-center space-x-2">
                        <!-- <button class="bg-green-500 text-white p-2 rounded-full hover:bg-green-400 transition-colors" 
                                onclick="window.openVLC('${video.weburl}')" title="Play">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                            </svg>
                        </button> -->
                        <button class="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-medium hover:bg-yellow-400 transition-colors"
                                onclick="window.location.href='edit.html?weburl=${video.weburl}'" title="edit file">
                            edit file
                        </button>
                        <button class="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-400 transition-colors"
                                onclick="window.open('${window.CDN_URL}${video.weburl}', '_blank')" title="Download">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                    <!-- Video info overlay -->
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="text-xs text-gray-300">
                            ${video.size ? `<div>Size: ${(video.size/1e6).toFixed(2)}mb</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="mt-2">
                    <a onclick="window.openVLC('${video.weburl}')" class="text-turkuazz text-sm mt-2 text-center block break-words cursor-pointer" title="${video.name}">
                        ${video.name}
                    </a>
                </div>
            </div>
        `).join('')

        videosGrid.innerHTML = videosHTML
        
        window.setImages("#category-video-images", "still")
        
        if (weburlParam) {
            highlightVideo(weburlParam)
            
            const url = new URL(window.location)
            url.searchParams.delete('weburl')
            window.history.replaceState({}, '', url)
            weburlParam = null
        }
    }

    function highlightVideo(weburl) {
        setTimeout(() => {
            const videoCard = document.querySelector(`[data-video-id="${weburl}"]`)
            if (videoCard) {
                videoCard.classList.add('video-highlight')
                
                const yOffset = -100
                const y = videoCard.getBoundingClientRect().top + window.pageYOffset + yOffset
                const scrollDistance = Math.abs(y - window.pageYOffset)
                const scrollTime = Math.min(Math.max(scrollDistance / 2, 500), 1000)
                
                window.scrollTo({
                    top: y,
                    behavior: 'smooth'
                })
                
                setTimeout(() => {
                    videoCard.classList.remove('video-highlight')
                }, scrollTime + 1000)
            }
        }, 300)
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredVideos.length / videosPerPage)
        
        if (totalPages <= 1) {
            pagination.classList.add('hidden')
            return
        }
        
        pagination.classList.remove('hidden')
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
        
        prevPageBtn.disabled = currentPage === 1
        nextPageBtn.disabled = currentPage === totalPages
    }

    sortSelect.addEventListener('change', function(e) {
        currentSort = e.target.value
        sortVideos()
        renderVideos()
    })

    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--
            renderVideos()
            updatePagination()
            window.scrollTo(0, 0)
        }
    })

    nextPageBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredVideos.length / videosPerPage)
        if (currentPage < totalPages) {
            currentPage++
            renderVideos()
            updatePagination()
            window.scrollTo(0, 0)
        }
    })
})