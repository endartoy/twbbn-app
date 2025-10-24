<script lang="ts">
    import { loadingState } from "$lib/loadingState";
	import { browser } from "$app/environment";

    // transition
	import { onDestroy } from "svelte";
	import { fade, slide } from "svelte/transition";

    // 
    import placeHolder from "$lib/assets/image-.png";

    // Frame
	import frame_0 from "$lib/assets/frame/0.png";
    import frame_0_bg from "$lib/assets/frame/0_base.png";
	import frame_1 from "$lib/assets/frame/1.png";
    import frame_1_bg from "$lib/assets/frame/1_base.png";
    const frames = [
        {
            title: 'SQUARE',
            url: frame_0,
            url_bg: frame_0_bg,
            size: [900, 900]
        },
        {
            title: 'POTRAIT',
            url: frame_1,
            url_bg: frame_1_bg,
            size: [900, 1200]
        },
    ]
    let selectedFrame = $state(null)

    // Image Picking
    let image = $state(null)
    let imageInput: HTMLInputElement = $state(null)
    let lastURL
    const compresImage = async(file) => {
        const bitmap = await createImageBitmap(file)

        // Set maximum dimensions
        const maxWidth = 1024;
        const scale = maxWidth / bitmap.width;
        const width = maxWidth;
        const height = bitmap.height * scale;

        // Create a canvas to draw compressed image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);

        // Convert to compressed JPEG blob
        const blob = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', 0.7)
        );

        // Generate a URL from compressed blob
        const url = URL.createObjectURL(blob as any);

        return url
    }
    let imageURL = $state(null)
    $effect(() => {
        if (image && image?.[0]) {
            loadingState.show()
            compresImage(image[0])
            .then((res) => {
                URL.revokeObjectURL(lastURL);
                lastURL = res;
                imageURL = res; // Update the reactive state
                loadingState.hide()
            })
            .catch((err) => {
                imageURL = lastURL; // Fallback to lastURL
                loadingState.hide()
            });
        } else {
            imageURL = null
        }
    })

    const clearImage = () => {
        image = new DataTransfer().files
        vZoom = 1
        vRotation = 0
    }

    const clearFrame = () => {
        selectedFrame = null
        vZoom = 1
        vRotation = 0
    }

    // mouse event
    let isDrag = $state(false)
    let offsetX = $state(0)
    let offsetY = $state(0)
    let lastX = $state(0)
    let lastY = $state(0)

    // touch zoom
    let initialDistance = $state(0);


    // add event listener for mouse and touch event
    $effect(() => {
        if (canvasCrop) {
            // add listener for move / zoom /rotate image
            canvasCrop.addEventListener('mousedown', (e) => {mouseDown(e)})
            canvasCrop.addEventListener('mousemove', (e) => {mouseMove(e)})
            canvasCrop.addEventListener('mouseup', mouseUp)
            canvasCrop.addEventListener('wheel', (e) => {mouseWheel(e)})

            canvasCrop.addEventListener('touchstart', (e) => {touchStart(e)})
            canvasCrop.addEventListener('touchmove', (e) => {touchMove(e)}, {passive: false})
            canvasCrop.addEventListener('touchend', touchEnd)

        }
    })

    const mouseDown = (event: MouseEvent) => {
        isDrag = true

        lastX = event.clientX
        lastY = event.clientY
    }

    const mouseMove = (event: MouseEvent) => {
        if (!isDrag) return
        event.preventDefault()

        const dx = event.clientX - lastX
        const dy = event.clientY - lastY

        offsetX += dx
        offsetY += dy

        lastX = event.clientX
        lastY = event.clientY
    } 

    const mouseUp = () => {
        isDrag = false
    }

    // Touch Events
    const getDistance = (touches: TouchList) => {
        const [touch1, touch2] = [touches[0], touches[1]];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const touchStart = (event: TouchEvent) => {
        isDrag = true

        if (event.touches.length === 2) {
            // zoom image
            initialDistance = getDistance(event.touches);
        } else {
            // move image
            const touch = event.touches[0]
            lastX = touch.clientX
            lastY = touch.clientY
        }
    }

    const touchMove = (event: TouchEvent) => {
        if (!isDrag) return
        event.preventDefault() // prevent page scrolling

        if (event.touches.length === 2) {
            // zoom
            const currentDistance = getDistance(event.touches);
            const scaleChange = currentDistance / initialDistance;

            // Update zoom level
            if (scaleChange > 1.05) {
                vZoom = Math.min(5, vZoom + 0.1); // Zoom in
                initialDistance = currentDistance; // reset
            } else if (scaleChange < 0.95) {
                vZoom = Math.max(0.5, vZoom - 0.1); // Zoom out
                initialDistance = currentDistance; // reset
            }

        } else {
            // move image
            const touch = event.touches[0]
            const dx = touch.clientX - lastX
            const dy = touch.clientY - lastY

            offsetX += dx
            offsetY += dy

            lastX = touch.clientX
            lastY = touch.clientY
        }
    }

    const touchEnd = () => {
        isDrag = false
    }


    // zoom
    const mouseWheel = (event: WheelEvent) => {
        event.preventDefault()

        const delta = Math.sign(event.deltaY)

        // Update scale
        if (delta > 0) {
            // Zoom out
            vZoom = Math.max(0.5, vZoom - 0.1);
        } else {
            // Zoom in
            vZoom = Math.max(0.5, vZoom + 0.1);
        }
    }


    // crop
    // Function to load an image and return a promise
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            image.src = src;
        });
    };

    //  rotatae image
    const getRotatedImage = (image: HTMLImageElement, angle: number): HTMLCanvasElement => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const radians = (angle * Math.PI) / 180;

        // Swap width/height for 90/270 rotation
        if (angle % 180 === 0) {
            canvas.width = image.width;
            canvas.height = image.height;
        } else {
            canvas.width = image.height;
            canvas.height = image.width;
        }

        // Move to center, rotate, then draw
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(
            image,
            - image.width / 2,
            - image.height / 2
        );

        return canvas;
    };

    // draw canvas
    let ctxCrop: CanvasRenderingContext2D = $state(null)
    let canvasCrop: HTMLCanvasElement = $state(null)
    let vZoom = $state(1)
    let vRotation = $state(0)

    $effect(() => {
        if (selectedFrame?.url && imageURL && vZoom && offsetX !== null && offsetY !== null && vRotation !== null) {
            loadImage(imageURL)
            .then((imageSrcXXX: HTMLImageElement) => {
                const context = canvasCrop.getContext('2d')
                if (!context) return
                ctxCrop = context

                // Rotate the image once
                const imageSrc = getRotatedImage(imageSrcXXX, vRotation);

                const [width, height] = selectedFrame.size

                // set canvas size
                canvasCrop.width = width
                canvasCrop.height = height

                // Clear canvas and set size
                ctxCrop.clearRect(0, 0, width, height); 

                // center image
                const canvasRatio = width / height
                const imgRatio = imageSrc.width / imageSrc.height

                let sx, sy, sWidth, sHeight
                if (imgRatio > canvasRatio) {
                    // Image is wider than canvas
                    sHeight = imageSrc.height / vZoom;
                    sWidth = sHeight * canvasRatio;
                } else {
                    // Image is taller than canvas
                    sWidth = imageSrc.width / vZoom;
                    sHeight = sWidth / canvasRatio;
                }

                sx = (imageSrc.width - sWidth) / 2;
                sy = (imageSrc.height - sHeight) / 2;

                // Draw Image
                ctxCrop.drawImage(
                    imageSrc,                   // image source 
                    sx, sy, sWidth, sHeight,    // full image with zoom
                    offsetX, 
                    offsetY, 
                    width,         // canvas width
                    height         // canvas height
                )
            })
            .catch((err) => {
                console.error(err)
            })
        }
    })

    // Download Final Image
    let ctx: CanvasRenderingContext2D = $state(null)
    let canvas: HTMLCanvasElement = $state(null)

    const downloadImage = () => {
        if (selectedFrame) {
            let isError = false

            loadingState.show()
            Promise.all([
                loadImage(selectedFrame.url), 
                loadImage(selectedFrame.url_bg)
            ])
            .then(([frm, frm_bg]: [HTMLImageElement, HTMLImageElement]) => {
                const context = canvas.getContext('2d')
                if (!context) return
                ctx = context
                const [width, height] = selectedFrame.size

                canvas.width = width
                canvas.height = height

                ctx.clearRect(0, 0, width, height); 

                ctx.drawImage(frm_bg, 0, 0, width, height)
                ctx.drawImage(canvasCrop, 0, 0, width, height)
                ctx.drawImage(frm, 0, 0, width, height)
            })
            .catch((err) => {
                isError = true
                alert(err)
            })
            .finally(() => {
                if (isError) return
                if (!browser) return; // prevent running on server

                const date = new Date();
                const pad = (n) => n.toString().padStart(2, '0');
                const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;

                const dataUrl = canvas.toDataURL('image/png');

                // iOS detection
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

                if (isIOS) {
                    // Convert data URL to Blob for iOS compatibility
                    const byteString = atob(dataUrl.split(',')[1]);
                    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    const url = URL.createObjectURL(blob);

                    // Create a temporary link for download
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `end-twbbn_${dateStr}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Clean up the object URL
                    URL.revokeObjectURL(url);
                } else {
                    const link = document.createElement('a');
                    link.download = `end-twbbn_${dateStr}.png`;
                    link.href = dataUrl;
                    link.click();
                }

                loadingState.hide()
            })
        }
    }

    onDestroy(() => {
        if (canvasCrop) {
            // remove listener for move / zoom /rotate image
            canvasCrop.removeEventListener('mousedown', (e) => {mouseDown(e)})
            canvasCrop.removeEventListener('mousemove', (e) => {mouseMove(e)})
            canvasCrop.removeEventListener('mouseup', mouseUp)
            canvasCrop.removeEventListener('wheel', (e) => {mouseWheel(e)})

            canvasCrop.removeEventListener('touchstart', (e) => {touchStart(e)})
            canvasCrop.removeEventListener('touchmove', (e) => {touchMove(e)})
            canvasCrop.removeEventListener('touchend', touchEnd)
        }
    })

    // $inspect()
</script>

<main class="container wrapper">
    <!-- Select frame -->
    {#if !selectedFrame}
        <div class="row" transition:slide={{delay: 60}}>
            <div class="col-xs-12">
                <h2 class="text-center"> PILIH FRAME </h2>
            </div>

            {#each frames as frame (frame.title)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="col-xs-6 col-md-6 col-lg-4 box" class:selected={selectedFrame?.url === frame?.url} onclick={() => selectedFrame = frame}>
                    <img src={frame.url} alt={frame.title}>
                    <h4 class="title">{frame.title}</h4>
                </div>
            {/each}
        </div>    
    {/if}

    <!-- Crop -->
    {#if selectedFrame}
        <div class="row middle-xs">
            <div class="col-xs-12 col-lg-6">
                <div class="crop-container" style={`aspect-ratio: ${selectedFrame.size[0]}/${selectedFrame.size[1]};`}>
                    {#if imageURL}
                        <canvas bind:this={canvasCrop}
                        transition:fade={{delay: 60}} class="canvas" class:isDrag={isDrag} > </canvas>
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <img class="upload-plachoder" src={placeHolder} onclick={() => imageInput.click()} alt="placaholder" transition:fade={{delay: 60}} />
                    {/if}
                    
                    <img class="frame" src={selectedFrame.url} alt="frame material" transition:fade={{delay: 60}} />
                </div>
            </div>

            <div class="col-xs-12 col-lg-6">
                {#if imageURL}
                    <div class="row" transition:slide={{delay: 60}}>         
                        <fieldset class="col-xs-12">
                            <label>
                                ZOOM
                                <input type="range" bind:value={vZoom} min="0.5" max="3" step="0.1" />
                            </label>
                        </fieldset>

                        <fieldset class="col-xs-12">
                            <label>
                                PUTAR
                                <input type="range" bind:value={vRotation} min="-180" max="180" step="5" />
                            </label>
                        </fieldset>

                        <div class="col-xs-12 button-box">
                            <button onclick={() => {clearImage(); imageInput.click()}} class="button secondary">UBAH FOTO</button>
                        </div>
                    </div>
                {/if}

                <div class="row">
                    <div class="col-xs-12 button-box">
                        <button onclick={clearFrame} class="button secondary" >UBAH FRAME</button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</main>

<!-- Download button -->
{#if selectedFrame && imageURL}
    <footer transition:fade={{delay: 60}}>
        <div class="container">
            <div class="row center-xs">
                <div class="col-xs-12 col-md-6 col-lg-4 button-box">
                    <button onclick={downloadImage} >DOWNLOAD</button>
                </div>
            </div>
        </div>
    </footer>
{/if}

<!-- Input Image -->
<input type="file" bind:files={image} bind:this={imageInput} accept="image/*" class="input-image" required>

<!-- Hidden Canvas for Final Image -->
<canvas bind:this={canvas} class="image-final"> </canvas>

<style>
    .input-image {
        visibility: hidden;
        display: none;
    }

    .container.wrapper {
        padding-bottom: 50px;
        padding-inline: 2.5rem;
    }

    footer {
        position: fixed;
        width: 100%;   
        bottom: 0;
        left: 0;
        background-color: white;

        .container{
            padding-inline: 2.5rem;
        }
    }

    /* frame selection */
    .box {
        /* width: 50%; */
        aspect-ratio: 1/1;
        overflow: hidden;
        position: relative;

        &.selected { border: 3px solid blueviolet; }

        >.title {
            position: absolute;
            bottom: 0;
            transform: translateX(-50%);
            left: 50%;
            text-transform: uppercase;
            background: rgba(0, 0, 0, 0.5); /* semi-transparent background */
            color: white;
            text-align: center;
            box-sizing: border-box;
            padding: 0.5rem;
            border-radius: 0.5em;
        }
        
        >img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }
    }

    /* crop */
    .crop-container {
        /* width: 100%; */
        max-width: 90vw;
        max-height: 90vh;
        width: auto;
        height: auto;
        position: relative;

        /* auto center */
        margin: 0 auto;
        margin-top: 3vh;
        margin-bottom: 3vh;

        canvas {
            position: absolute;
            width: 100%;
            height: 100%;
            cursor: grab;

            &.isDrag {
                cursor: grabbing;
            }
        }

        img.upload-plachoder {
            width: 5rem;
            height: 5rem;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translateY(-50%) translateX(-50%);
        }

        img.frame {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
    }

    /* button box */
    .button-box {
        display: flex;
        /* padding-inline: 5px; */
        padding-block: 5px;

        button {
            flex-grow: 1;
        }
    }

    .image-final {
        display: none;
        visibility: hidden;
    }
</style>
