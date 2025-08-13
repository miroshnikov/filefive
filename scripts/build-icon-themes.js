const fs = require('node:fs')
const { basename, extname, resolve } = require('path')
const { execSync } = require('child_process')
require('dotenv').config()

execSync('rm -rf ../src/icon-themes/*')
execSync('rm -rf ../frontend/src/assets/icon-themes/*')



fs.readdir(process.env.VSCODE, (err, files) => {
    fs.writeFileSync(
        '../src/icon-themes/languages.json',
        JSON.stringify(
            files
                .filter(dir => fs.existsSync(`${process.env.VSCODE}/${dir}/package.json`))
                .map(dir => JSON.parse( fs.readFileSync(`${process.env.VSCODE}/${dir}/package.json`) )['contributes']?.['languages'] )
                .filter(dir => !!dir)
                .flatMap(langs => langs.map(({id, extensions, filenames, filenamePatterns}) => 
                        ({id, extensions, filenames, filenamePatterns})))
        )
    )
})


function fontIconsCSS(rootPath, name) {
    const config = JSON.parse( fs.readFileSync(`../src/icon-themes/${name}.json`) )

    let fontId
    config.fonts.forEach(font => {
        fontId = `${name}-${font.id}`
        const fontPath = font.src[0].path
        fs.copyFileSync(
            `${resolve(rootPath, fontPath)}`,
            `../frontend/src/assets/icon-themes/${fontId}${extname(fontPath)}`
        )
    })

    fs.writeFileSync(
        `../frontend/src/assets/icon-themes/${name}.css`,
        config.fonts.map(font =>
            `@font-face {
                font-family: "${name}-${font.id}";
                src: url('${name}-${font.id}${extname(font.src[0].path)}') format('${font.src[0].format}');
                font-weight: ${font.weight ?? 'normal'};
                font-style: ${font.style ?? 'normal'};
            }
        `
        ).join('') + 
        Object.entries(config.iconDefinitions).map(([code, style]) => 
            `.fileicon[data-code="${code}"]::before {
                font-family: '${style.fontId ? name+'-'+style.fontId : fontId}';
                color: ${style.fontColor ?? 'var(--color)'};
                content: '${style.fontCharacter}'; 
            }
            `
        ).join('')
    )
}

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


// SETI

fs.copyFileSync(
    `${process.env.VSCODE}/theme-seti/icons/vs-seti-icon-theme.json`,
    '../src/icon-themes/seti.json'
)

fontIconsCSS(`${process.env.VSCODE}/theme-seti/icons`, 'seti')

fs.writeFileSync(
    '../frontend/src/assets/icon-themes/seti.css',
    `
        .fileicon::before {
            font-size: 1.2rem !important;
        }
    `,
    { flag: 'a'}
)

// MATERIAL

fs.cpSync(
    `${process.env.VSEXT}/pkief.material-icon-theme-5.25.0/icons`,
    '../frontend/src/assets/icon-themes/material',
    { recursive: true }
)

fs.copyFileSync(
    `${process.env.VSEXT}/pkief.material-icon-theme-5.25.0/dist/material-icons.json`,
    '../src/icon-themes/material.json'
)

imageIconsCSS('material')



// VSICONS

fs.cpSync(
    `${process.env.VSEXT}/vscode-icons-team.vscode-icons-12.14.0/icons`,
    '../frontend/src/assets/icon-themes/vsicons',
    { recursive: true }
)

fs.copyFileSync(
    `${process.env.VSEXT}/vscode-icons-team.vscode-icons-12.14.0/dist/src/vsicons-icon-theme.json`,
    '../src/icon-themes/vsicons.json'
)

imageIconsCSS('vsicons')


// AYU

fs.cpSync(
    `${process.env.VSEXT}/teabyii.ayu-1.0.5/icons`,
    '../frontend/src/assets/icon-themes/ayu',
    { recursive: true }
)

fs.copyFileSync(
    `${process.env.VSEXT}/teabyii.ayu-1.0.5/ayu-icons.json`,
    '../src/icon-themes/ayu.json'
)

imageIconsCSS('ayu')


// VSCODEGREAT

fs.cpSync(
    `${process.env.VSEXT}/emmanuelbeziat.vscode-great-icons-2.1.119/icons`,
    '../frontend/src/assets/icon-themes/vscodegreat',
    { recursive: true }
)

fs.copyFileSync(
    `${process.env.VSEXT}/emmanuelbeziat.vscode-great-icons-2.1.119/icons.json`,
    '../src/icon-themes/vscodegreat.json'
)

imageIconsCSS(
    'vscodegreat',
    path => path.replace('./icons/', '')
)


// FILEICONS

fs.copyFileSync(
    `${process.env.VSEXT}/file-icons.file-icons-1.1.0/icons/file-icons-icon-theme.json`,
    '../src/icon-themes/fileicons.json'
)

fontIconsCSS(`${process.env.VSEXT}/file-icons.file-icons-1.1.0/icons`, 'fileicons')


// NOMO

fs.cpSync(
    `${process.env.VSEXT}/be5invis.vscode-icontheme-nomo-dark-1.3.6/src`,
    '../frontend/src/assets/icon-themes/nomo',
    { recursive: true }
)

fs.copyFileSync(
    `${process.env.VSEXT}/be5invis.vscode-icontheme-nomo-dark-1.3.6/icons.json`,
    '../src/icon-themes/nomo.json'
)
let src = fs.readFileSync('../src/icon-themes/nomo.json').toString()
src = src.replace(/\/\/.*$/gm, '') // remove comments
fs.writeFileSync('../src/icon-themes/nomo.json', src)

imageIconsCSS('nomo')
