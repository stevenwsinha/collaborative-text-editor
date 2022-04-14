window.onload = async function() {
    let logout = document.getElementById("logout-button")
    logout.onclick = () => {
        fetch("/users/logout", {method: "POST"})
    }
    
    await fetch("/collection/list")
        .then(response => response.json())
        .then(data => {
            let container = document.getElementById("most-recent")

            for(let i = 0; i < data.length; i++) {
                let docDiv = document.createElement("div")
                docDiv.classList.add("doc-div")
                
                let docLink = document.createElement("a")
                let docLinkText = document.createTextNode(data[i].name)
                docLink.append(docLinkText)
                docLink.title = data[i].name
                docLink.href = "/doc/edit/" + data[i].id

                let deleteButton = document.createElement("button")
                let buttonText = document.createElement("spam")
                buttonText.innerHTML = "Delete"
                deleteButton.appendChild(buttonText)
                deleteButton.onclick = async () => {
                    let id = data[i].id
                    await fetch("/collection/delete", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({docid: id})
                    })
                    window.location.reload(true)
                }

                docDiv.appendChild(docLink)
                docDiv.appendChild(document.createElement("br"))
                docDiv.appendChild(document.createElement("br"))
                docDiv.appendChild(deleteButton)
                docDiv.appendChild(document.createElement("br"))

                container.appendChild(docDiv)
            }
        })
}