import { useEffect, useState, useRef } from 'react'
import { toUserTime } from '../App'



import { projects } from "../assets/data/projects.json"
import {posts} from '../assets/data/posts.json'

import ImageRoller from "../components/ImageRoller"

import '../assets/styles/projects.css'

const fullImageBlobImport = Object.values(import.meta.glob("@assets/images/*/*.{png,jpg,jpeg,PNG,JPEG,webp,WEBP,svg}", { eager: true, query: '?url', import: 'default' }))

const placeholder = fullImageBlobImport.filter((blob) => blob.includes("placeholder"))[0]
// console.log(placeholder)
/* expected:
{
    "v2-stopwatch": [
        "/src/assets/images/v2-stopwatch/0.png"
    ],
    "portfolio": []
}
*/


export default function Projects() {
    const [projectSectionElements, setProjectSectionElements] = useState([])
    const [projectData, setProjectData] = useState({})
    const [scrollPosition, setScrollPosition] = useState(0)
    const [rollerImages, setRollerImages] = useState([])
    const [rateLimitExceeded, setRateLimitExceeded] = useState(false)

    


    function fetchAll() {
        let data = {}
        projects.forEach(async (project, index) => {
            // fetch api from project
            if(project.api){
            // console.log(project.api)
                try {
                    const initialResponse = await fetch(project.api,
                        {
                            method: 'GET',
                            headers: {'Content-Type': 'application/vnd.github+json'}
                        }
                    ).then((response) => {
                        if (!response.ok) {
                            if (response.status == 403) {
                                console.log("403, setting rate limit exceeded message")
                                setRateLimitExceeded(true)
                            }
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response
                    })
                    const newData = await initialResponse.json()

                    async function getCommits(page){
                        return fetch(`https://api.github.com/repos/${newData.owner.login}/${newData.name}/commits?per_page=100&page=${page}`,
                            {
                                method: 'GET',
                                headers: {'Content-Type': 'application/vnd.github+json'}
                            }
                        ).then((response) => {
                            if (!response.ok) {
                                if (response.status == 403) {
                                    console.log("403, setting rate limit exceeded message")
                                    setRateLimitExceeded(true)
                                }
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response
                        })
                    }
                    let page = 1
                    let commitResponse = await getCommits(page)
                    newData.commits = await commitResponse.json()

                    while(commitResponse.headers.get('Link') && commitResponse.headers.get('Link').includes('rel="next"')){
                        page++
                        commitResponse = await getCommits(page)
                        newData.commits = newData.commits.concat(await commitResponse.json())
                    }


                    //https://api.github.com/repos/moefingers/react-timer-stopwatch-v2/contents/social/square.png
                    
                    const meta = await fetch(`https://api.github.com/repos/${newData.owner.login}/${newData.name}/contents`,
                        {
                            method: 'GET',
                            headers: {'Content-Type': 'application/vnd.github+json'}
                        }
                    )
                    newData.meta = await meta.json()

                    newData.meta.forEach((file) => {
                        if(file.name.includes("social-square")){newData.squareImage = `https://raw.githubusercontent.com/${newData.owner.login}/${newData.name}/${newData.default_branch}/${file.path}`}
                        if(file.name.includes("social-wide")){newData.wideImage = `https://raw.githubusercontent.com/${newData.owner.login}/${newData.name}/${newData.default_branch}/${file.path}`}
                    })
                    
                    data = Object.assign({}, data, {[project.api]: await newData})
                   
                    setProjectData(data)
                    
                } catch (error) {
                    console.log(error)
                    console.log("eeee")
                }
            }
        })
    }

        
    
    const projectsScrollElement = useRef(null)
    const projectsPageContainerElement = useRef(null)
    useEffect(() => {
        
        // projectsPageContainerElement.current.style.height = projectsPageContainerElement.current.offsetHeight + "px"

 
        fetchAll()
        // const data = {}
        // projects.forEach((project) => {
        //     data[project] = project
        // })
        // setProjectData(data)

        projectsScrollElement.current.onscroll = () => {
            const currentPosition = (projectsScrollElement.current.scrollTop)
            const eachHeight = (document.querySelector("section").scrollHeight)
            const newScrollPosition = currentPosition / eachHeight
            // console.log(currentPosition,    eachHeight, newScrollPosition)
            // console.log(0.00188323 * window.innerWidth)
            setScrollPosition(newScrollPosition)
        }

    }, [])


    useEffect(() => {
        const scrollElement = projectsScrollElement.current
        const scrollBarWidth = (scrollElement.offsetWidth - scrollElement.clientWidth)
        scrollElement.style.paddingLeft = `${scrollBarWidth / scrollElement.offsetWidth * 52}%`
        scrollElement.style.paddingRight = `${scrollBarWidth / scrollElement.offsetWidth * 52}%`
    }, [projectSectionElements])


 

    useEffect(() => {
        // console.log(projectData)
            // posts
        const projectPosts = {}; posts.forEach(({connectedToProject, path}, index) => {
            if(connectedToProject != undefined){
                projectPosts[connectedToProject] = path
            }
        }); //console.log(projectPosts)

        const sections = []
        const preStateRollerImages = []
        projects.forEach((project, index) => {
            // console.log(index,project)
            if(projectData[project.api]){ // if github
                project = projectData[project.api]
                preStateRollerImages.push(project.squareImage)
                // console.log(project)
                // console.log(index, project.homepage)
                sections.push (
                    <section key={index} className="project-section" id={project.name}>
                        <div className='safe-zone-top'>
                            <h1 className="project-title">
                                GitHub - <a href={project.owner.html_url} target='_blank'>{project.owner.login}</a> /<br/>
                                <a className='project-name' href={project.html_url} target='_blank'>{project.name}({project.default_branch})</a>
                            </h1>

                            {project.fork && <h2 className="project-fork">Forked from <a href={project.parent.html_url} target='_blank'>{project.parent.owner.login}</a></h2>}

                            <ul className="project-topics">{project.topics.map((topic, index) => <li key={index}>{topic}</li>)}</ul>
                            {project.homepage != "" && <a className='deployment-link' href={project.homepage} target='_blank'>Visit Deployment</a>}

                            <p>Created: {toUserTime(project.created_at)}</p>
                            <p>Updated: {toUserTime(project.updated_at)}</p>
                        </div>
                        <div className="safe-zone-bottom">
                            <p className="project-description">
                                {projectPosts[project.name] && <a className='project-post' href={"#/Posts/" +projectPosts[project.name]}>Read Full Post</a>
                                } - {project.description} - <span className="project-commits">{project.commits.length } <span>commits</span></span> - <a 
                                className='project-license' href={"https://choosealicense.com/licenses/" + project.license.key} target='_blank'>{project.license.name}</a>
                            </p>
                            
                            <img className="project-wide-image" src={project.wideImage} alt="wide-image" onError={e => e.target.src = ""}/>
                            


                            {index == 0 && <div className="scroll-note">scroll down...</div>}
                        </div>
                        

                        
                    </section>
                )
            } else { // if not github
                preStateRollerImages.push(placeholder)
                sections.push (
                    <section key={index} className="project-section">
                        <h1 className="project-title">{project.name}</h1>
                        <p className="project-description">{project.description}</p>
                    </section>
                )
            }

            
        })


        setProjectSectionElements(sections)
        setRollerImages(preStateRollerImages)

        

    }, [projectData])

    return (
        <div className="projects-page-container" ref={projectsPageContainerElement}>
            {rateLimitExceeded && <div className="rate-limit-exceeded">GitHub API rate limit exceeded.</div>}
            <div ref={projectsScrollElement} className='scroll' >
                {Object.values(projectData)[0] 
                ? [...projectSectionElements] 
                : rateLimitExceeded ? null :"Loading.. if you wait too long that means you hit a rate limit!"}
                <ImageRoller scrollPosition={scrollPosition} projectsScrollElement={projectsScrollElement.current} rollerImages={rollerImages} backupImage={placeholder}/>
            </div>
        </div>
    )
}