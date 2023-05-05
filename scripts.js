document.addEventListener("DOMContentLoaded", function () {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const imageList = document.getElementById('imageList');
    const generateFiles = document.getElementById('generateFiles');
    const themeToggle = document.getElementById('themeToggle');
    const toggleButton = document.querySelector('.toggle-button');
    const body = document.body;

    body.classList.add('dark');
    updateIcons();

    themeToggle.addEventListener('change', () => {
        body.classList.toggle('dark');
        body.classList.toggle('light');
        updateIcons();
        updateTextareaBackgroundColors();
    });

    toggleButton.addEventListener('click', () => {
        themeToggle.checked = !themeToggle.checked;
        themeToggle.dispatchEvent(new Event('change'));
    });

    function updateIcons() {
        const lightIcon = document.querySelector('.light-icon');
        const darkIcon = document.querySelector('.dark-icon');
        const darkMode = body.classList.contains('dark');
        lightIcon.style.opacity = darkMode ? '1' : '0.2';
        darkIcon.style.opacity = darkMode ? '0.2' : '1';
    }

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('active');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('active');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener("change", function (e) {
        const files = fileInput.files;
        handleFiles(files);
    });

    function onTextareaInput(textarea) {
        const darkMode = body.classList.contains('dark');
        const empty = !textarea.value.trim();
        if (textarea.highlight) {
            textarea.style.backgroundColor = empty
                ? (darkMode ? '#ECCC87' : '#3B4252')
                : '';
        }
    }
    function updateTextareaBackgroundColors() {
        const textareas = document.querySelectorAll('.imageContainer textarea');
        textareas.forEach((textarea) => {
            onTextareaInput(textarea);
        });
    }

    function resetTextareaHighlights() {
        const textareas = document.querySelectorAll('.imageContainer textarea');
        textareas.forEach((textarea) => {
            textarea.highlight = false;
            textarea.style.backgroundColor = '';
        });
    }


    function handleFiles(files) {
        imageList.innerHTML = '';
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                    const container = document.createElement('div');
                    container.classList.add('imageContainer');
                    const imgElement = document.createElement('img');
                    imgElement.src = reader.result;
                    imgElement.dataset.filename = file.name;
                    container.appendChild(imgElement);
                    container.appendChild(document.createElement('textarea'));
                    imageList.appendChild(container);
                    generateFiles.disabled = false;

                    const textarea = container.querySelector('textarea');
                    textarea.addEventListener('input', () => onTextareaInput(textarea));
                };
            };
        });
    }

    async function processFiles(imageContainers, zip) {
        for (const container of imageContainers) {
            const textarea = container.querySelector('textarea');
            const img = container.querySelector('img');
            const fileName = img.dataset.filename;
            const fileExtension = fileName.split('.').pop();
            const baseName = fileName.substring(0, fileName.lastIndexOf('.'));

            zip.file(`${baseName}.txt`, textarea.value);

            const imgBlob = await fetch(img.src).then((response) => response.blob());
            zip.file(`${baseName}.${fileExtension}`, imgBlob);
        }
    }

    generateFiles.addEventListener('click', async () => {
        const zip = new JSZip();
        const imageContainers = document.querySelectorAll('.imageContainer');
        const errorMessage = document.getElementById('errorMessage');
        let emptyTextCount = 0;

        errorMessage.style.display = 'none';
        imageContainers.forEach((container) => {
            const textarea = container.querySelector('textarea');
            onTextareaInput(textarea);
            if (!textarea.value.trim()) emptyTextCount++;
        });

        if (emptyTextCount > 0) {
            let message;
            if (emptyTextCount === 1) {
                message = "You've left a caption unwritten.";
            } else {
                message = `You've left ${emptyTextCount} captions unwritten.`;
            }
            errorMessage.textContent = message;
            errorMessage.style.marginTop = '10px';
            errorMessage.style.display = 'inline';
            errorMessage.style.color = '';
            const generateAnywayButton = createActionButton("I want to generate anyway", async () => {
                generateFiles.disabled = true;
                generateAnywayButton.remove();
                writeNowButton.remove();
                errorMessage.style.display = 'none';
                await generateZipFile(zip, imageContainers);
            });

            const writeNowButton = createActionButton("I'm going to write them now", () => {
                generateFiles.disabled = false;
                generateAnywayButton.remove();
                writeNowButton.remove();
                errorMessage.textContent = "I've highlighted the missing captions for you.";
                errorMessage.style.color = '';
                generateFiles.style.display = 'block';

                imageContainers.forEach((container) => {
                    const textarea = container.querySelector('textarea');
                    if (!textarea.value.trim()) {
                        textarea.highlight = true;
                    }
                    onTextareaInput(textarea);
                });
            });

            generateFiles.style.display = 'none';
            generateFiles.insertAdjacentElement('afterend', generateAnywayButton);
            generateFiles.insertAdjacentElement('afterend', writeNowButton);

            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.justifyContent = 'space-between';
            generateFiles.parentNode.insertBefore(buttonWrapper, generateFiles.nextSibling);
            buttonWrapper.appendChild(generateAnywayButton);
            buttonWrapper.appendChild(writeNowButton);

            return;
        }

        await generateZipFile(zip, imageContainers);

        function createActionButton(text, onClick) {
            const button = document.createElement('a');
            button.textContent = text;
            button.className = 'button';
            button.addEventListener('click', onClick);
            return button;
        }

        async function generateZipFile(zip, imageContainers) {
            try {
                await processFiles(imageContainers, zip);
                const zipBlob = await zip.generateAsync({type: 'blob'});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = 'images_text.zip';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error(err);
                alert('An error occurred while generating the zip file.');
            }
        }
    });
})