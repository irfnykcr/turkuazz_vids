
const loggerEdit = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[EDIT] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[EDIT] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[EDIT] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[EDIT] [${timestamp}] [DEBUG]`, ...args)
	}
}

document.addEventListener('DOMContentLoaded', async function() {
    let allFiles = []
    let filteredFiles = []
    let selectedFile = null
    let allCategories = {}
    let flatCategories = []

    const fileSelectionPage = document.getElementById('fileSelectionPage')
    const loadingState = document.getElementById('loadingState')
    const categoryFilter = document.getElementById('categoryFilter')
    const searchInput = document.getElementById('searchInput')
    const clearSearch = document.getElementById('clearSearch')
    const fileSelect = document.getElementById('fileSelect')
    const editFileBtn = document.getElementById('editFileBtn')

    const fileEditingPage = document.getElementById('fileEditingPage')
    const backToSelection = document.getElementById('backToSelection')
    const weburl = document.getElementById('weburl')
    const fileName = document.getElementById('fileName')
    const fileType = document.getElementById('fileType')
    const fileCategory = document.getElementById('fileCategory')
    const filePrivate = document.getElementById('filePrivate')
    const fileAbout = document.getElementById('fileAbout')
    const cancelEdit = document.getElementById('cancelEdit')
    const saveChanges = document.getElementById('saveChanges')

    const getEnvVars = async () => {
        if (!localStorage.getItem("envVars")) {
            loggerEdit.info("waiting for envVars")
            await new Promise(resolve => setTimeout(resolve, 750))
            return getEnvVars()
        }
        return JSON.parse(localStorage.getItem("envVars"))
    }

    const envVars = await getEnvVars()
    window.API_URL = envVars.API_URL
    window.API_KEY = envVars.API_KEY
    window.CDN_URL = envVars.CDN_URL

    async function loadData() {
        try {
            loadingState.classList.remove('hidden')
            fileSelect.innerHTML = '<option value="">Loading...</option>'

            await loadFiles()
            
            await loadCategories()
            
            populateCategoryFilters()
            
            populateFileDropdown()
            
            const urlParams = new URLSearchParams(window.location.search)
            const weburlParam = urlParams.get('weburl')
            
            if (weburlParam) {
                loggerEdit.info('Weburl from URL:', weburlParam)
                fileSelect.value = weburlParam
                selectFileForEdit()
                if (selectedFile) {
                    startEditing()
                }
            }
            
            loadingState.classList.add('hidden')
        } catch (error) {
            loggerEdit.error('Error loading data:', error)
            loadingState.classList.add('hidden')
            fileSelect.innerHTML = '<option value="">Error loading files</option>'
        }
    }

    async function loadFiles() {
        if (!localStorage.getItem("all_files")) {
            loggerEdit.info("waiting for all_files")
            await new Promise(resolve => setTimeout(resolve, 750))
            return loadFiles()
        }
        allFiles = JSON.parse(localStorage.getItem("all_files")) || []
        
        allFiles = allFiles.filter(file => file && (file.weburl !== undefined && file.weburl !== null))
        
        filteredFiles = [...allFiles]
        loggerEdit.info('Loaded files:', allFiles.length)
        
        if (allFiles.length > 0) {
            loggerEdit.info('Sample file structure:', allFiles[0])
            loggerEdit.info('Sample weburl type:', typeof allFiles[0].weburl, 'value:', allFiles[0].weburl)
        }
        
        return allFiles
    }

    async function loadCategories() {
        if (!localStorage.getItem("all_categories")) {
            loggerEdit.info("waiting for all_categories")
            await new Promise(resolve => setTimeout(resolve, 750))
            return loadCategories()
        }
        allCategories = JSON.parse(localStorage.getItem("all_categories")) || {}
        
        flatCategories = flattenCategories(allCategories)
        loggerEdit.info('Loaded categories:', flatCategories.length)
        return allCategories
    }

    function flattenCategories(categories, prefix = '') {
        let result = []
        
        Object.keys(categories).forEach(category => {
            const path = prefix ? `${prefix}/${category}/` : `${category}/`
            result.push(path)
            
            if (typeof categories[category] === 'object' && Object.keys(categories[category]).length > 0) {
                result = result.concat(flattenCategories(categories[category], path.slice(0, -1)))
            }
        })
        
        return result
    }

    function populateCategoryFilters() {
        let selectionOptions = '<option value="all">All Categories</option>'
        flatCategories.forEach(category => {
            selectionOptions += `<option value="${category}">${category}</option>`
        })
        categoryFilter.innerHTML = selectionOptions
        
        let editOptions = '<option value="">Select Category</option>'
        flatCategories.forEach(category => {
            editOptions += `<option value="${category}">${category}</option>`
        })
        fileCategory.innerHTML = editOptions
    }

    function filterFiles() {
        const category = categoryFilter.value
        const searchTerm = searchInput.value.toLowerCase().trim()
        
        loggerEdit.info('Filtering - Category:', category, 'Search:', searchTerm)
        
        if (category === 'all' && !searchTerm) {
            filteredFiles = [...allFiles]
        } else {
            filteredFiles = allFiles.filter(file => {
                const matchesCategory = category === 'all' || file.category === category
                const matchesSearch = !searchTerm || (file.name && file.name.toLowerCase().includes(searchTerm))
                return matchesCategory && matchesSearch
            })
        }
        
        loggerEdit.info('Filtered files:', filteredFiles.length)
        populateFileDropdown()
    }

    function populateFileDropdown() {
        fileSelect.value = ''
        editFileBtn.disabled = true
        selectedFile = null
        
        if (filteredFiles.length === 0) {
            fileSelect.innerHTML = '<option value="">No files found</option>'
            return
        }

        
        let options = '<option value="">Choose a file...</option>'
        filteredFiles.forEach(file => {
            if (!file || (file.weburl === undefined || file.weburl === null)) return
            
            const name = file.name || 'Unnamed file'
            const categoryDisplay = file.category || 'No category'
            const sizeDisplay = file.size ? ` - ${file.size}` : ''
            
            const weburlValue = file.weburl
            
            options += `<option value="${weburlValue}">${name} (${categoryDisplay}${sizeDisplay})</option>`
        })
        
        fileSelect.innerHTML = options
        loggerEdit.info('Populated dropdown with', filteredFiles.length, 'files')
    }

    function selectFileForEdit() {
        const selectedWeburl = fileSelect.value
        
        loggerEdit.info('File select changed. Selected weburl:', selectedWeburl, 'type:', typeof selectedWeburl)
        
        if (!selectedWeburl) {
            editFileBtn.disabled = true
            selectedFile = null
            loggerEdit.info('No file selected, button disabled')
            return
        }
        
        selectedFile = allFiles.find(file => {
            return String(file.weburl) === String(selectedWeburl)
        })
        
        if (selectedFile) {
            editFileBtn.disabled = false
            loggerEdit.info('Selected file found:', selectedFile.name)
        } else {
            editFileBtn.disabled = true
            loggerEdit.info('Selected file NOT found for weburl:', selectedWeburl)
            loggerEdit.info('Available weburl values and types:')
            allFiles.forEach((file, index) => {
                loggerEdit.info(`File ${index}: weburl="${file.weburl}" (${typeof file.weburl})`)
            })
        }
    }

    function startEditing() {
        if (!selectedFile) {
            loggerEdit.error('No file selected for editing')
            return
        }
        
        loggerEdit.info('Starting edit for:', selectedFile.name)
        
        weburl.value = selectedFile.weburl || ''
        fileName.value = selectedFile.name || ''
        fileType.value = selectedFile.ftype || ''
        fileCategory.value = selectedFile.category || ''
        filePrivate.checked = selectedFile.private === true || selectedFile.private === 'true'
        fileAbout.value = selectedFile.about || ''
        
        updatePrivateToggle()
        
        fileSelectionPage.classList.add('hidden')
        fileEditingPage.classList.remove('hidden')
        
        loggerEdit.info('Switched to edit page')
    }

    function goBackToSelection() {
        loggerEdit.info('Going back to selection page')
        fileEditingPage.classList.add('hidden')
        fileSelectionPage.classList.remove('hidden')
        
        selectedFile = null
        fileSelect.value = ''
        editFileBtn.disabled = true
    }

    function updatePrivateToggle() {
        const dot = document.querySelector('.dot')
        const toggleBg = document.querySelector('.toggle-bg')
        
        if (filePrivate.checked) {
            dot.style.transform = 'translateX(24px)'
            toggleBg.classList.add('bg-turkuazz')
            toggleBg.classList.remove('bg-gray-600')
        } else {
            dot.style.transform = 'translateX(0px)'
            toggleBg.classList.remove('bg-turkuazz')
            toggleBg.classList.add('bg-gray-600')
        }
    }

    async function saveFileChanges() {
        if (!selectedFile) {
            loggerEdit.error('No file selected for saving')
            return
        }
        
        if (!fileName.value.trim()) {
            alert('File name is required')
            return
        }
        
        const updatedFile = {
            weburl: selectedFile.weburl,
            name: fileName.value.trim(),
            filetype: fileType.value.trim(),
            category: fileCategory.value,
            private: filePrivate.checked ? 1 : 0,
            about: fileAbout.value.trim()
        }
        
        loggerEdit.info('Saving file changes:', updatedFile)
        
        try {
            saveChanges.disabled = true
            saveChanges.innerHTML = `
                <div class="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-dark-bg mr-2"></div>
                Saving...
            `
            
            const response = await fetch(`${window.API_URL}/files/editfile`, {
                method: 'POST',
                headers: {
                    'api-key': `${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedFile)
            })
            
            if (response.ok) {
                window.localStorage.removeItem("all_files")

                alert('File updated successfully!')
                goBackToSelection()
                
                filterFiles()
            } else {
                const errorText = await response.text()
                throw new Error(`Failed to update file: ${errorText}`)
            }
        } catch (error) {
            loggerEdit.error('Error updating file:', error)
            alert('Error updating file. Please try again.')
        } finally {
            saveChanges.disabled = false
            saveChanges.innerHTML = 'Save Changes'
        }
    }

    function clearSearchInput() {
        searchInput.value = ''
        filterFiles()
    }

    categoryFilter.addEventListener('change', filterFiles)
    searchInput.addEventListener('input', filterFiles)
    clearSearch.addEventListener('click', clearSearchInput)
    fileSelect.addEventListener('change', selectFileForEdit)
    editFileBtn.addEventListener('click', startEditing)
    backToSelection.addEventListener('click', goBackToSelection)
    cancelEdit.addEventListener('click', goBackToSelection)
    saveChanges.addEventListener('click', saveFileChanges)
    filePrivate.addEventListener('change', updatePrivateToggle)
    document.querySelector('label').addEventListener('click', function(e) {
        if (e.target.tagName !== 'INPUT') {
            filePrivate.checked = !filePrivate.checked
            updatePrivateToggle()
        }
    })
    
    loggerEdit.info('Initializing edit page...')
    loadData()
})