const fs = require('node:fs')
const { execSync } = require('child_process')

execSync('rm -rf ../src/icon-themes/*')
execSync('rm -rf ../frontend/src/assets/icon-themes/*')



const vsCodeRoot = '/System/Volumes/Data/Applications/Visual Studio Code.app/Contents/Resources/app/extensions'


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

let css = `@font-face {
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

fs.writeFileSync(
    '../frontend/src/assets/icon-themes/seti.css',
    css
)
