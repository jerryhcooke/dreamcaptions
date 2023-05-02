document.addEventListener("DOMContentLoaded", function () {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const rename = document.getElementById('rename');
    const imageList = document.getElementById('imageList');
    const generateFiles = document.getElementById('generateFiles');
    const themeToggle = document.getElementById('themeToggle');
    const toggleButton = document.querySelector('.toggle-button');
    const imageRatioAlert = document.getElementById("imageRatioAlert");
    const resizeImagesBtn = document.getElementById("resizeImagesBtn");
    const body = document.body;

    let nonSquareImages = [];

    body.classList.add('dark'); // Default mode: dark
    updateIcons(); // Set the correct initial icon state

    function checkImageRatio(image) {
        return image.width === image.height;
    }

    function showImageRatioAlert(imageElement) {
        imageRatioAlert.style.display = "block";
        showImageRatioAlert.imageElement = imageElement; // Store the image element here
        resizeImagesBtn.imageElement = imageElement; // Assign the image element to the button as well
        resizeImagesBtn.addEventListener('click', () => {
            resizeImage(imageElement);
        });
    }

    const resizeImages = document.getElementById('resizeImages');
    function resizeImage(imageElement) {
        if (!imageElement) return;

        const croppieImage = imageElement;
        const currentContainer = croppieImage.parentElement;

        setTimeout(() => {
            const croppieInstance = new Croppie(croppieImage, {
                viewport: { width: 200, height: 200, type: 'square' },
                boundary: { width: 200, height: 200 },
                enableZoom: true,
            });

            croppieImage.style.display = 'none';
            currentContainer.appendChild(croppieInstance.element);

            // Add the confirm button
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Confirm';
            confirmButton.addEventListener('click', () => {
                // Get the cropped image and replace the original image
                croppieInstance.result({ type: 'base64', size: 'original', format: 'jpeg' }).then((result) => {
                    const img = document.createElement('img');
                    img.src = result;
                    img.onload = () => {
                        currentContainer.querySelector('img').src = result;
                        currentContainer.querySelector('img').style.display = 'block';
                        currentContainer.querySelector('.cr-boundary').remove();
                        currentContainer.querySelector('.cr-slider-wrap').remove();
                        confirmButton.remove();
                    };
                });
            });
            currentContainer.appendChild(confirmButton);

        }, 0);
    }

    resizeImagesBtn.addEventListener('click', () => {
        const imageElement = resizeImagesBtn.imageElement;
        if (imageElement) {
            resizeImage(imageElement);
        }
    });


    themeToggle.addEventListener('change', () => {
        if (body.classList.contains('dark')) {
            body.classList.remove('dark');
            body.classList.add('light');
        } else {
            body.classList.remove('light');
            body.classList.add('dark');
        }
        updateIcons();
    });

    toggleButton.addEventListener('click', () => {
        themeToggle.checked = !themeToggle.checked;
        themeToggle.dispatchEvent(new Event('change'));
    });

        function updateIcons() {
            if (body.classList.contains('dark')) {
                document.querySelector('.light-icon').style.opacity = '1';
                document.querySelector('.dark-icon').style.opacity = '0.2';
            } else {
                document.querySelector('.light-icon').style.opacity = '0.2';
                document.querySelector('.dark-icon').style.opacity = '1';
            }
        }

        updateIcons();


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
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                let image = document.createElement('img');
                image.src = URL.createObjectURL(file);

                image.onload = function () {
                    if (!checkImageRatio(image)) {
                        nonSquareImages.push(image);
                        showImageRatioAlert(image);
                    }
                };
            }
        });

        fileInput.addEventListener("change", function (e) {
            const files = fileInput.files;
            handleFiles(files);

            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                let image = new Image();
                image.src = URL.createObjectURL(file);

                image.onload = function () {
                    if (!checkImageRatio(image)) {
                        nonSquareImages.push(image);
                        showImageRatioAlert(image);
                        resizeImage(image);
                    }
                };
            }
        });

        function onTextareaInput(textarea) {
            if (textarea.value.trim()) {
                textarea.style.backgroundColor = '';
            }
        }


    function handleFiles(files) {
        imageList.innerHTML = '';
        Array.from(files).forEach((file, index) => {
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

                    if (!checkImageRatio(img)) {
                        nonSquareImages.push(img);
                        showImageRatioAlert(imgElement);
                        resizeImage(imgElement);
                    }
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
                if (!textarea.value.trim()) {
                    emptyTextCount++;
                    textarea.style.backgroundColor = '#BF616A';
                } else {
                    textarea.style.backgroundColor = '';
                }
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
                errorMessage.style.color = '#BF616A';

                const generateAnywayButton = document.createElement('a');
                generateAnywayButton.textContent = "I want to generate anyway";
                generateAnywayButton.className = 'button';
                generateAnywayButton.addEventListener('click', async () => {
                    generateFiles.disabled = true;
                    generateAnywayButton.remove();
                    writeNowButton.remove();
                    emptyTextCount = 0;
                    imageContainers.forEach((container) => {
                        const textarea = container.querySelector('textarea');
                        if (!textarea.value.trim()) {
                            emptyTextCount++;
                        }
                    });
                    for (const [index, container] of imageContainers.entries()) {
                        const textarea = container.querySelector('textarea');
                        const textFileName = `${index + 1}.txt`;
                        zip.file(textFileName, textarea.value);
                    }
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
                });

                const writeNowButton = document.createElement('a');
                writeNowButton.textContent = "I'm going to write them now";
                writeNowButton.className = 'button';
                writeNowButton.addEventListener('click', () => {
                    generateFiles.disabled = false;
                    generateAnywayButton.remove();
                    writeNowButton.remove();
                    imageContainers.forEach((container) => {
                        const textarea = container.querySelector('textarea');
                        if (!textarea.value.trim()) {
                            textarea.style.backgroundColor = getComputedStyle(body).color;
                        } else {
                            textarea.style.backgroundColor = '';
                        }
                    });
                    errorMessage.textContent = "I've highlighted the missing captions for you.";
                    errorMessage.style.color = '';
                });

                generateFiles.style.display = 'none'; // Hide 'Generate Captions' button
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

            for (const [index, container] of imageContainers.entries()) {
                const textarea = container.querySelector('textarea');
                const textFileName = `${index + 1}.txt`;
                zip.file(textFileName, textarea.value);
            }

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
        });
    });