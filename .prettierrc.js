module.exports = {
  printWidth: 120, // 调整以匹配ESLint中的"max-len"规则（120字符）
  tabWidth: 2, // 与两者配置一致
  useTabs: false, // 添加此行以明确使用空格而非制表符，与普遍代码风格一致
  semi: true, // 与ESLint配置中"semi"规则保持一致，即在语句末尾添加分号
  singleQuote: false, // 调整以匹配ESLint配置中的"quotes"规则（使用双引号）
  trailingComma: 'none', // 调整以匹配ESLint配置中的"comma-dangle"规则（禁止末尾逗号）
  arrowParens: 'avoid', // 调整以与ESLint配置中的倾向相匹配，特别是在"arrow-body-style"规则暗示的按需使用圆括号
  bracketSpacing: true, // 保持默认，与多数风格指南一致
  jsxBracketSameLine: false, // 默认设置，可根据具体需求调整
  endOfLine: 'lf', // 维持跨平台兼容性，默认或依据项目规范
};
