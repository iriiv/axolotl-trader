/* Статический импорт game.json без правки tsconfig (resolveJsonModule
   выключен в каркасе дизайнера). Vite сам резолвит JSON на этапе сборки,
   здесь мы задаём только тип: содержимое валидируется в api.ts. */
declare module '*.json' {
  const content: unknown
  export default content
}
