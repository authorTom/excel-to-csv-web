document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const directoryInput = document.getElementById('directoryInput');
    const directoryPath = document.getElementById('directoryPath');
    const fileCount = document.getElementById('fileCount');
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const resultContainer = document.getElementById('resultContainer');
    const resultList = document.getElementById('resultList');
    const successCount = document.getElementById('successCount');
    const failCount = document.getElementById('failCount');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // State variables
    let files = [];
    let directoryFiles = [];
    let convertedFiles = [];
    let activeTab = 'individual';

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
            activeTab = tab;
            updateButtonState();
        });
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('dragover');
    }

    function unhighlight() {
        dropArea.classList.remove('dragover');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = [...dt.files];
        handleFiles(newFiles);
    }

    // File input change
    fileInput.addEventListener('change', function() {
        handleFiles([...this.files]);
    });

    // Directory input change
    directoryInput.addEventListener('change', function() {
        const selectedFiles = [...this.files].filter(file => 
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );
        
        directoryFiles = selectedFiles;
        directoryPath.value = selectedFiles.length > 0 ? 
            selectedFiles[0].webkitRelativePath.split('/')[0] : '';
        fileCount.textContent = selectedFiles.length;
        
        updateButtonState();
    });

    // Handle files
    function handleFiles(newFiles) {
        // Filter only Excel files
        const excelFiles = newFiles.filter(file => 
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );
        
        // Add to files array
        files = [...files, ...excelFiles];
        
        // Update UI
        updateFileList();
        updateButtonState();
    }

    // Update file list in UI
    function updateFileList() {
        fileList.innerHTML = '';
        
        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${file.name}</span>
                <i class="fas fa-times remove-file" data-index="${index}"></i>
            `;
            fileList.appendChild(li);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                files.splice(index, 1);
                updateFileList();
                updateButtonState();
            });
        });
    }

    // Update button states
    function updateButtonState() {
        if (activeTab === 'individual') {
            convertBtn.disabled = files.length === 0;
            clearBtn.disabled = files.length === 0;
        } else {
            convertBtn.disabled = directoryFiles.length === 0;
            clearBtn.disabled = directoryFiles.length === 0;
        }
    }

    // Clear files
    clearBtn.addEventListener('click', function() {
        if (activeTab === 'individual') {
            files = [];
            updateFileList();
        } else {
            directoryFiles = [];
            directoryPath.value = '';
            fileCount.textContent = '0';
        }
        
        updateButtonState();
        resultContainer.style.display = 'none';
    });

    // Convert files
    convertBtn.addEventListener('click', async function() {
        const filesToConvert = activeTab === 'individual' ? files : directoryFiles;
        const delimiter = document.getElementById('delimiter').value;
        const sheetOption = document.getElementById('sheet').value;
        const includeHeaders = document.getElementById('includeHeaders').checked;
        
        // Reset results
        convertedFiles = [];
        resultList.innerHTML = '';
        successCount.textContent = '0';
        failCount.textContent = '0';
        
        // Show progress
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Converting files: 0%';
        
        let successfulConversions = 0;
        let failedConversions = 0;
        
        // Process each file
        for (let i = 0; i < filesToConvert.length; i++) {
            const file = filesToConvert[i];
            const progress = Math.round(((i + 1) / filesToConvert.length) * 100);
            
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Converting files: ${progress}%`;
            
            try {
                const result = await convertExcelToCSV(file, delimiter, sheetOption, includeHeaders);
                convertedFiles.push(...result);
                
                // Add to result list
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${file.name} <i class="fas fa-check success"></i></span>
                    <i class="fas fa-download download" data-index="${convertedFiles.length - result.length}"></i>
                `;
                resultList.appendChild(li);
                
                successfulConversions++;
            } catch (error) {
                console.error('Error converting file:', error);
                
                // Add to result list
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${file.name} <i class="fas fa-times error"></i> Error: ${error.message}</span>
                `;
                resultList.appendChild(li);
                
                failedConversions++;
            }
            
            // Update counts
            successCount.textContent = successfulConversions;
            failCount.textContent = failedConversions;
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Show results
        resultContainer.style.display = 'block';
        
        // Add event listeners to download buttons
        document.querySelectorAll('.download').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                downloadCSV(convertedFiles[index]);
            });
        });
    });

    // Download all CSV files
    downloadAllBtn.addEventListener('click', function() {
        if (convertedFiles.length === 0) return;
        
        if (convertedFiles.length === 1) {
            // If only one file, download it directly
            downloadCSV(convertedFiles[0]);
        } else {
            // If multiple files, create a zip
            const zip = new JSZip();
            
            convertedFiles.forEach(file => {
                zip.file(file.filename, file.content);
            });
            
            zip.generateAsync({type: 'blob'}).then(function(content) {
                saveAs(content, 'excel_to_csv_files.zip');
            });
        }
    });

    // Convert Excel to CSV
    async function convertExcelToCSV(file, delimiterOption, sheetOption, includeHeaders) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    const delimiter = delimiterOption === 'comma' ? ',' : 
                                     delimiterOption === 'semicolon' ? ';' : '\t';
                    
                    const results = [];
                    
                    if (sheetOption === 'first') {
                        // Convert only the first sheet
                        const firstSheet = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheet];
                        
                        const csv = XLSX.utils.sheet_to_csv(worksheet, {
                            FS: delimiter,
                            blankrows: false,
                            skipHidden: true
                        });
                        
                        const filename = file.name.replace(/\.(xlsx|xls)$/i, '.csv');
                        
                        results.push({
                            filename,
                            content: csv,
                            originalFile: file.name
                        });
                    } else {
                        // Convert all sheets to separate CSV files
                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            
                            const csv = XLSX.utils.sheet_to_csv(worksheet, {
                                FS: delimiter,
                                blankrows: false,
                                skipHidden: true
                            });
                            
                            // Create a valid filename from sheet name
                            const safeSheetName = sheetName.replace(/[\\/:*?"<>|]/g, '_');
                            const filename = file.name.replace(/\.(xlsx|xls)$/i, `_${safeSheetName}.csv`);
                            
                            results.push({
                                filename,
                                content: csv,
                                originalFile: file.name,
                                sheetName
                            });
                        });
                    }
                    
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Download a single CSV file
    function downloadCSV(file) {
        const blob = new Blob([file.content], {type: 'text/csv;charset=utf-8'});
        saveAs(blob, file.filename);
    }
});