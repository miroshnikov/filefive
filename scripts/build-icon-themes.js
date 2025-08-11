const fs = require('node:fs')
const os = require('os');
const { basename } = require('path')
const { execSync } = require('child_process')

execSync('rm -rf ../src/icon-themes/*')
execSync('rm -rf ../frontend/src/assets/icon-themes/*')


const vsCodeRoot = '/System/Volumes/Data/Applications/Visual Studio Code.app/Contents/Resources/app/extensions'
const vsCodeExtRoot = os.homedir() + '/.vscode/extensions'



fs.readdir(vsCodeRoot, (err, files) => {
    fs.writeFileSync(
        '../src/icon-themes/languages.json',
        JSON.stringify(
            files
                .filter(dir => fs.existsSync(`${vsCodeRoot}/${dir}/package.json`))
                .map(dir => JSON.parse( fs.readFileSync(`${vsCodeRoot}/${dir}/package.json`) )['contributes']?.['languages'] )
                .filter(dir => !!dir)
                .flatMap(langs => langs.map(({id, extensions, filenames, filenamePatterns}) => 
                        ({id, extensions, filenames, filenamePatterns})))
        )
    )
})


// SETI

fs.copyFileSync(
    `${vsCodeRoot}/theme-seti/icons/seti.woff`,
    '../frontend/src/assets/icon-themes/seti.woff'
)

fs.copyFileSync(
    `${vsCodeRoot}/theme-seti/icons/vs-seti-icon-theme.json`,
    '../src/icon-themes/seti.json'
)

fs.writeFileSync(
    '../frontend/src/assets/icon-themes/seti.css',
    `@font-face {
        font-family: "seti"; 
        src: url('seti.woff')   
        format("woff"); 
    }
    .fileicon::before {
        font-family: seti !important;
        font-style: normal;
        font-weight: normal !important;
        vertical-align: top;
        opacity: .8;
    }
    ` +  
    Object.entries(
        JSON.parse(fs.readFileSync('../src/icon-themes/seti.json')).iconDefinitions
    ).map(([code, style]) => 
        `
            .fileicon[data-code="${code}"]::before {
                color: ${style.fontColor};
                content: '${style.fontCharacter}'; 
            }
        `
    ).join('')
)



function imageIconsCSS(name, parseName = path => basename(path)) {
    fs.writeFileSync(
        `../frontend/src/assets/icon-themes/${name}.css`,
        `.fileicon {
            background: no-repeat center / contain;
        }
        ` +  
        Object.entries( JSON.parse(fs.readFileSync(`../src/icon-themes/${name}.json`)).iconDefinitions )
            .map(([code, { iconPath }]) => 
                `.fileicon[data-code="${code}"] {
                    background-image: url('${name}/${parseName(iconPath)}')
                }
                `)
            .join('')
    )
}

// MATERIAL

fs.cpSync(
    `${vsCodeExtRoot}/pkief.material-icon-theme-5.25.0/icons`,
    '../frontend/src/assets/icon-themes/material',
    { recursive: true }
)

fs.copyFileSync(
    `${vsCodeExtRoot}/pkief.material-icon-theme-5.25.0/dist/material-icons.json`,
    '../src/icon-themes/material.json'
)

imageIconsCSS('material')



// VSICONS

fs.cpSync(
    `${vsCodeExtRoot}/vscode-icons-team.vscode-icons-12.14.0/icons`,
    '../frontend/src/assets/icon-themes/vsicons',
    { recursive: true }
)

fs.copyFileSync(
    `${vsCodeExtRoot}/vscode-icons-team.vscode-icons-12.14.0/dist/src/vsicons-icon-theme.json`,
    '../src/icon-themes/vsicons.json'
)

imageIconsCSS('vsicons')


// AYU

fs.cpSync(
    `${vsCodeExtRoot}/teabyii.ayu-1.0.5/icons`,
    '../frontend/src/assets/icon-themes/ayu',
    { recursive: true }
)

fs.copyFileSync(
    `${vsCodeExtRoot}/teabyii.ayu-1.0.5/ayu-icons.json`,
    '../src/icon-themes/ayu.json'
)

imageIconsCSS('ayu')


// VSCODEGREAT

fs.cpSync(
    `${vsCodeExtRoot}/emmanuelbeziat.vscode-great-icons-2.1.119/icons`,
    '../frontend/src/assets/icon-themes/vscodegreat',
    { recursive: true }
)

fs.copyFileSync(
    `${vsCodeExtRoot}/emmanuelbeziat.vscode-great-icons-2.1.119/icons.json`,
    '../src/icon-themes/vscodegreat.json'
)

imageIconsCSS(
    'vscodegreat',
    path => path.replace('./icons/', '')
)


// FILEICONS

// fs.copyFileSync(
//     `${vsCodeExtRoot}/file-icons.file-icons-1.1.0/icons/file-icons-icon-theme.json`,
//     '../src/icon-themes/fileicons.json'
// )


// NOMO

fs.cpSync(
    `${vsCodeExtRoot}/be5invis.vscode-icontheme-nomo-dark-1.3.6/src`,
    '../frontend/src/assets/icon-themes/nomo',
    { recursive: true }
)

fs.copyFileSync(
    `${vsCodeExtRoot}/be5invis.vscode-icontheme-nomo-dark-1.3.6/icons.json`,
    '../src/icon-themes/nomo.json'
)
let src = fs.readFileSync('../src/icon-themes/nomo.json').toString()
src = src.replace(/\/\/.*$/gm, '') // remove comments
fs.writeFileSync('../src/icon-themes/nomo.json', src)

imageIconsCSS('nomo')
