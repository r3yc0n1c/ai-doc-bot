import fs from 'fs';
import removeMarkdown from 'remove-markdown';

function protectComparisonOperators(text) {
  return text
    .replace(/>=/g, 'PLACEHOLDER_GTE')
    .replace(/<=/g, 'PLACEHOLDER_LTE');
}

function restoreComparisonOperators(text) {
  return text
    .replace(/PLACEHOLDER_GTE/g, '>=')
    .replace(/PLACEHOLDER_LTE/g, '<=');
}

function removeYamlFrontMatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function processHintBlocks(text) {
  return text.replace(
    /{%\s*hint[^%]*%}\s*([\s\S]*?)\s*{%\s*endhint\s*%}/g,
    '$1'
  );
}

function convertMarkdownToPlainText(inputPath, outputPath) {
  try {
    let mdContent = fs.readFileSync(inputPath, 'utf8');
    
        mdContent = removeYamlFrontMatter(mdContent);
    
        mdContent = processHintBlocks(mdContent);
    
        mdContent = protectComparisonOperators(mdContent);
    
        let plainText = removeMarkdown(mdContent);
    
        plainText = restoreComparisonOperators(plainText);
    
    fs.writeFileSync(outputPath, plainText, 'utf8');
    console.log(`Converted ${inputPath} to plain text in ${outputPath}`);
  } catch (error) {
    console.error('Error converting Markdown to plain text:', error);
  }
}

const inputFile = 'data/raw_doc/open-source-projects/server/server-environment-setup/linux.md';
const outputFile = 'data/processed/linux.txt';

convertMarkdownToPlainText(inputFile, outputFile);
