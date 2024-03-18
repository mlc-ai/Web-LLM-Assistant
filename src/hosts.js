// web agent interface
export function findHost() {
    console.log("Determining host")
    url = window.location.toString()
    if (url.includes("overleaf")){

        var overleaf = {leftRightMargin: 15, 
            tempContentDiv: document.getElementsByClassName("cm-content")[0], 
            boundingRect: document.getElementsByClassName("cm-activeLine")[0]
        }
        return overleaf
    }else{
        var gdocs = {leftRightMargin: 100, 
            tempContentDiv: document.getElementsByClassName("companion-enabled")[0], 
            boundingRect: document.getElementsByClassName("companion-enabled")[0]
        }

        return gdocs
    }
}
