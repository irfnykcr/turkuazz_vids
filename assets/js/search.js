
const loggerSearch = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[SEARCH] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[SEARCH] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[SEARCH] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[SEARCH] [${timestamp}] [DEBUG]`, ...args)
	}
}

document.addEventListener('DOMContentLoaded', async function() {
    let allFiles = []
    let filteredFiles = []
    let allCategories = {}
    let fileTypes = new Set()
    
    let currentPage = 1
    let itemsPerPage = 12
    let totalPages = 1
    
    
    const searchInput = document.getElementById('searchInput')
    const clearSearch = document.getElementById('clearSearch')
    const searchButton = document.getElementById('searchButton')
    const categoryFilter = document.getElementById('categoryFilter')
    const typeFilter = document.getElementById('typeFilter')
    const sortBy = document.getElementById('sortBy')
    const loadingState = document.getElementById('loadingState')
    const noResultsState = document.getElementById('noResultsState')
    const searchResults = document.getElementById('searchResults')
    
    const paginationControls = document.getElementById('paginationControls')
    const prevPageBtn = document.getElementById('prevPageBtn')
    const nextPageBtn = document.getElementById('nextPageBtn')
    const currentPageEl = document.getElementById('currentPage')
    const totalPagesEl = document.getElementById('totalPages')
    const itemsPerPageSelect = document.getElementById('itemsPerPage')

    const urlParams = new URLSearchParams(window.location.search)
    const queryParam = urlParams.get('query')
    
    const getEnvVars = async () => {
        if (!localStorage.getItem("envVars")) {
            await new Promise(resolve => setTimeout(resolve, 750))
            return getEnvVars()
        }
        return JSON.parse(localStorage.getItem("envVars"))
    }

    const envVars = await getEnvVars()
    window.API_URL = envVars.API_URL
    window.API_KEY = envVars.API_KEY
    window.CDN_URL = envVars.CDN_URL

    async function initSearchPage() {
        try {
            showLoading(true)
            
            await Promise.all([loadFiles(), loadCategories()])
            
            populateCategoryFilter()
            populateTypeFilter()
            
            sortBy.value = 'relevance'
            itemsPerPageSelect.value = itemsPerPage.toString()
            
            if (queryParam) {
                searchInput.value = queryParam
                performSearch()
            } else {
                filteredFiles = [...allFiles]
                sortResults('name')
                updatePagination()
                displayResults()
            }
            
            showLoading(false)
        } catch (error) {
            showLoading(false)
            showNoResults('Error loading data. Please try again.')
        }
    }

    async function loadFiles() {
        if (!localStorage.getItem("all_files")) {
            await new Promise(resolve => setTimeout(resolve, 750))
            return loadFiles()
        }
        
        allFiles = JSON.parse(localStorage.getItem("all_files")) || []
        
        allFiles = allFiles.filter(file => {
            const isValid = file && (file.weburl !== undefined && file.weburl !== null)
            if (isValid && file.ftype) {
                fileTypes.add(file.ftype)
            }
            return isValid
        })
        
        return allFiles
    }

    async function loadCategories() {
        if (!localStorage.getItem("all_categories")) {
            await new Promise(resolve => setTimeout(resolve, 750))
            return loadCategories()
        }
        
        allCategories = JSON.parse(localStorage.getItem("all_categories")) || {}
        return allCategories
    }

    function flattenCategories(categories, prefix = '') {
        let result = []
        
        Object.keys(categories).forEach(category => {
            const path = prefix ? prefix + '/' + category + '/' : category + '/'
            result.push(path)
            
            if (typeof categories[category] === 'object' && Object.keys(categories[category]).length > 0) {
                result = result.concat(flattenCategories(categories[category], path.slice(0, -1)))
            }
        })
        
        return result
    }

    function populateCategoryFilter() {
        const flatCategories = flattenCategories(allCategories)
        
        let options = '<option value="all">All Categories</option>'
        flatCategories.forEach(category => {
            options += '<option value="' + category + '">' + category + '</option>'
        })
        
        categoryFilter.innerHTML = options
    }

    function populateTypeFilter() {
        let options = '<option value="all">All Types</option>'
        
        Array.from(fileTypes).sort().forEach(type => {
            options += '<option value="' + type + '">' + type + '</option>'
        })
        
        typeFilter.innerHTML = options
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden')
            noResultsState.classList.add('hidden')
            searchResults.classList.add('hidden')
            paginationControls.classList.add('hidden')
        } else {
            loadingState.classList.add('hidden')
        }
    }

    function showNoResults(message = 'No results found. Try adjusting your search or filters.') {
        noResultsState.querySelector('p').textContent = message
        noResultsState.classList.remove('hidden')
        searchResults.classList.add('hidden')
        paginationControls.classList.add('hidden')
    }

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim()
        const category = categoryFilter.value
        const fileType = typeFilter.value
        const sortOption = sortBy.value
        
        const fuzzyMatchThreshold = 40
        
        filteredFiles = allFiles.filter(file => {
            let matchesSearch = !searchTerm
            
            if (searchTerm) {
                const searchTerms = searchTerm.split(/\s+/)
                matchesSearch = searchTerms.some(term => {
                    const nameScore = file.name ? fuzzyMatch(file.name, term) : 0
                    const aboutScore = file.about ? fuzzyMatch(file.about, term) : 0
                    return nameScore >= fuzzyMatchThreshold || aboutScore >= fuzzyMatchThreshold
                })
            }
                
            const matchesCategory = category === 'all' || file.category === category
            const matchesType = fileType === 'all' || file.ftype === fileType
            
            return matchesSearch && matchesCategory && matchesType
        })
        
        sortResults(sortOption)
        
        currentPage = 1
        updatePagination()
        displayResults()
    }

    function levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null))
        
        for (let i = 0; i <= str1.length; i++) {
            track[0][i] = i
        }
        
        for (let j = 0; j <= str2.length; j++) {
            track[j][0] = j
        }
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                )
            }
        }
        
        return track[str2.length][str1.length]
    }
    
    function fuzzyMatch(str, pattern) {
        if (!pattern || !str) return 0
        str = str.toLowerCase()
        pattern = pattern.toLowerCase()
        
        if (str === pattern) return 100
        
        if (str.includes(pattern)) {
            const position = str.indexOf(pattern)
            return 90 - (position * 0.1)
        }
        
        const distance = levenshteinDistance(str, pattern)
        const maxLength = Math.max(str.length, pattern.length)
        
        let similarityScore = Math.max(0, 100 - ((distance / maxLength) * 100))
        
        return similarityScore
    }

    function calculateRelevanceScore(file, searchTerm) {
        if (!searchTerm) return 0
        
        let score = 0
        const fileName = (file.name || '').toLowerCase()
        const fileAbout = (file.about || '').toLowerCase()
        const searchTerms = searchTerm.toLowerCase().split(/\s+/)
        
        if (fileName === searchTerm) score += 100
        
        searchTerms.forEach(term => {
            const nameScore = fuzzyMatch(fileName, term)
            score += nameScore
            
            const aboutScore = fuzzyMatch(fileAbout, term) * 0.3
            score += aboutScore
        })
        
        return score
    }

    function sortResults(sortOption) {
        const searchTerm = searchInput.value.toLowerCase().trim()
        
        switch (sortOption) {
            case 'relevance':
                if (searchTerm) {
                    filteredFiles.forEach(file => {
                        file._relevanceScore = calculateRelevanceScore(file, searchTerm)
                        
                        file._matchDetails = {
                            searchTerm: searchTerm,
                            nameScore: file.name ? fuzzyMatch(file.name.toLowerCase(), searchTerm) : 0,
                            aboutScore: file.about ? fuzzyMatch(file.about.toLowerCase(), searchTerm) : 0
                        }
                    })
                    
                    filteredFiles.sort((a, b) => {
                        return b._relevanceScore - a._relevanceScore
                    })
                } else {
                    filteredFiles.sort((a, b) => {
                        return (a.name || '').localeCompare(b.name || '')
                    })
                }
                break
            case 'name':
                filteredFiles.sort((a, b) => {
                    return (a.name || '').localeCompare(b.name || '')
                })
                break
            case 'name-desc':
                filteredFiles.sort((a, b) => {
                    return (b.name || '').localeCompare(a.name || '')
                })
                break
            case 'newest':
                filteredFiles.sort((a, b) => {
                    return parseInt(b.weburl || '0') - parseInt(a.weburl || '0')
                })
                break
            case 'oldest':
                filteredFiles.sort((a, b) => {
                    return parseInt(a.weburl || '0') - parseInt(b.weburl || '0')
                })
                break
        }
    }

    function updatePagination() {
        if (filteredFiles.length === 0) {
            paginationControls.classList.add('hidden')
            return
        }
        
        totalPages = Math.ceil(filteredFiles.length / itemsPerPage)
        
        if (currentPage > totalPages) {
            currentPage = totalPages
        }
        
        currentPageEl.textContent = currentPage
        totalPagesEl.textContent = totalPages
        
        prevPageBtn.disabled = currentPage === 1
        nextPageBtn.disabled = currentPage === totalPages
        
        paginationControls.classList.remove('hidden')
    }

    function displayResults() {
        if (filteredFiles.length === 0) {
            showNoResults()
            return
        }
        
        noResultsState.classList.add('hidden')
        searchResults.classList.remove('hidden')
        
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, filteredFiles.length)
        const currentPageItems = filteredFiles.slice(startIndex, endIndex)
        
        let resultsHTML = ''
        
        currentPageItems.forEach(file => {
            const fileName = file.name || 'Unnamed file'
            const fileCategory = file.category || 'No category'
            const fileType = file.ftype || 'Unknown'
            const fileAbout = file.about || 'No description'
            const weburl = file.weburl
            
            let matchQualityIndicator = ''
            const searchTerm = searchInput.value.toLowerCase().trim()
            if (searchTerm && file._relevanceScore !== undefined) {
                const matchQuality = file._relevanceScore > 80 ? 'high' : 
                                    file._relevanceScore > 60 ? 'medium' : 'low'
                const matchColor = matchQuality === 'high' ? 'bg-green-500' : 
                                  matchQuality === 'medium' ? 'bg-yellow-500' : 'bg-red-400'
                
                matchQualityIndicator = '<div class="absolute top-2 left-2 px-2 py-1 rounded-full text-xs ' + 
                                       matchColor + ' text-black font-bold opacity-70">' +
                                       'Match: ' + Math.round(file._relevanceScore) + '%</div>'
            }
            
            resultsHTML += `<div class="bg-dark-card rounded-lg overflow-hidden border border-gray-700 hover:border-turkuazz transition-colors">
                <div class="h-32 bg-gray-800 relative overflow-hidden">
                    <img data-weburl="${weburl}" class="search-result-image w-full h-full object-cover">
                    ${matchQualityIndicator}
                    <div class="absolute bottom-2 right-2 bg-dark-bg bg-opacity-70 rounded px-2 py-1 text-xs">
                        ${fileType}
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-1 truncate" title="${fileName}">${fileName}</h3>
                    <p class="text-gray-400 text-sm mb-2">${fileCategory}</p>
                    <p class="text-gray-300 text-sm line-clamp-2 h-10 mb-3">${fileAbout}</p>
                    <div class="flex justify-between items-center">
                        <a href="edit.html?weburl=${file.weburl}" class="text-turkuazz hover:underline text-sm">Edit</a>
                        <button onclick="window.location.href='category.html?catg=${fileCategory}&weburl=${file.weburl}'" class="view-details bg-turkuazz hover:bg-turkuazz-dark text-dark-bg font-medium px-3 py-1 rounded text-sm">
                            View
                        </button>
                    </div>
                </div>
            </div>`
        })
        
        searchResults.innerHTML = resultsHTML
        
        window.setImages('.search-result-image', 'still')
    }

    function goToPage(page) {
        if (page < 1 || page > totalPages) return
        
        currentPage = page
        updatePagination()
        displayResults()
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    function clearSearchInput() {
        searchInput.value = ''
        performSearch()
    }

    function updateItemsPerPage() {
        itemsPerPage = parseInt(itemsPerPageSelect.value)
        currentPage = 1
        updatePagination()
        displayResults()
    }

    searchButton.addEventListener('click', performSearch)
    clearSearch.addEventListener('click', clearSearchInput)
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch()
        }
    })
    categoryFilter.addEventListener('change', performSearch)
    typeFilter.addEventListener('change', performSearch)
    sortBy.addEventListener('change', performSearch)
    
    prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1))
    nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1))
    itemsPerPageSelect.addEventListener('change', updateItemsPerPage)

    initSearchPage()
})
