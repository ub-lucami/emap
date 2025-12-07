document.getElementById("startBtn").addEventListener("click", loadNewImage);
document.getElementById("yesBtn").addEventListener("click", function() {
    postYes();
    loadBlankImage();
    setTimeout(function() {
        loadNewImage();
    }, 1000);
});
document.getElementById("noBtn").addEventListener("click", function() {
    postNo();
    loadBlankImage();
    setTimeout(function() {
        loadNewImage();
    }, 1000);
});

function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

function loadNewImage() {
    fetch('/api/get-image/', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.image_url) {
            document.getElementById("displayImage").src = data.image_url;
            document.getElementById("imageContainer").style.display = "flex";
            document.getElementById("startTextContainer").style.display = "none";
            document.getElementById("startBtn").style.display = "none";
            document.getElementById("startBtnContainer").style.display = "none";
            document.getElementById("halfwayContainer").style.display = "none";
            document.getElementById("finishContainer").style.display = "none";
            document.getElementById("startContainer").style.display = "none";
        }
        if (data.image_name) {
            console.log("Image name:", data.image_name);
            document.getElementById("imageName").textContent = data.image_name;
        }
        if (data.image_idx && data.step_sizes) {
            console.log("Image index:", data.image_idx);
            document.getElementById("imageIdx").textContent = data.image_idx;
            if (parseInt(data.image_idx) <= 50) {
                if (parseInt(data.image_idx) == 1) {
                    document.getElementById("noBtn").style.display = "none";
                    document.getElementById("comparisonText").textContent = "Oglejte si sliko in pritisnite gumb Da.";
                } else {
                    document.getElementById("noBtn").style.display = "flex";
                    document.getElementById("comparisonText").textContent = data.step_sizes[0];
                }
            } else {
                if (parseInt(data.image_idx) == 51 || parseInt(data.image_idx) == 52) {
                    document.getElementById("noBtn").style.display = "none";
                    document.getElementById("comparisonText").textContent = "Oglejte si sliko in pritisnite gumb Da.";
                } else {
                    document.getElementById("noBtn").style.display = "flex";
                    document.getElementById("comparisonText").textContent = data.step_sizes[1];
                }
            }
        }
        if (data.image_idx_in_set) {
            console.log("Image index in set:", data.image_idx_in_set);
            document.getElementById("imageIdxInSet").textContent = data.image_idx_in_set;
        }
        if (data.message) {
            console.log(data.message);
            if (data.message === "Halfway through the experiment") {
                document.getElementById("startTextContainer").style.display = "none";
                document.getElementById("startBtn").style.display = "block";
                document.getElementById("startBtnContainer").style.display = "flex";
                document.getElementById("imageContainer").style.display = "none";
                document.getElementById("halfwayContainer").style.display = "flex";
                document.getElementById("finishContainer").style.display = "none";
                document.getElementById("startContainer").style.display = "flex";
            }
            if (data.message === "Experiment finished") {
                document.getElementById("startTextContainer").style.display = "none";
                document.getElementById("startBtn").style.display = "none";
                document.getElementById("startBtnContainer").style.display = "none";
                document.getElementById("imageContainer").style.display = "none";
                document.getElementById("halfwayContainer").style.display = "none";
                document.getElementById("finishContainer").style.display = "flex";
                document.getElementById("startContainer").style.display = "none";
            }
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
}

function postYes() {
    fetch('/api/post-yes/', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ 
            image_name: document.getElementById("imageName").textContent,
            image_idx: document.getElementById("imageIdx").textContent
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => {
        console.error("Error:", error);
    });
}

function postNo() {
    fetch('/api/post-no/', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            image_name: document.getElementById("imageName").textContent,
            image_idx: document.getElementById("imageIdx").textContent
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => {
        console.error("Error:", error);
    });
}

function loadBlankImage() {
    document.getElementById("startTextContainer").style.display = "none";
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("startBtnContainer").style.display = "none";
    document.getElementById("imageContainer").style.display = "flex";
    document.getElementById("displayImage").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    document.getElementById("halfwayContainer").style.display = "none";
    document.getElementById("finishContainer").style.display = "none";
    document.getElementById("startContainer").style.display = "none";
}