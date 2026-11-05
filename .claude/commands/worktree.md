---
description: Crea un git worktree aislado en .trees/ y ejecuta ahí las instrucciones dadas
argument-hint: <instrucciones a ejecutar en el worktree>
---

Instrucciones recibidas: $ARGUMENTS

Sigue estos pasos en orden:

1. **Nombre**: deduce un nombre corto en kebab-case (2-4 palabras, minúsculas, sin acentos ni espacios) a partir de las instrucciones. Ejemplo: "añadir habilidad de congelar fila" → `habilidad-congelar-fila`.
2. **Verifica**: revisa que `.trees/<nombre>` no exista y que la rama `<nombre>` no exista (`git worktree list`, `git branch --list <nombre>`). Si chocan, añade un sufijo (`-2`).
3. **Ignora `.trees/`**: si `.trees/` no está en `.gitignore`, añádelo (sin commitear).
4. **Crea el worktree**: ejecuta `git worktree add .trees/<nombre>` desde la raíz del repo.
5. **Ejecuta las instrucciones dentro del worktree**:
   - Todas las rutas de lectura/edición deben apuntar a `.trees/<nombre>/...`, nunca a los archivos de la raíz.
   - Los comandos de shell se ejecutan con ese directorio como cwd (`git -C .trees/<nombre> ...`, o `cd` dentro de la misma llamada).
   - No modifiques, commitees ni hagas checkout en el código principal. El trabajo queda aislado en la rama `<nombre>`.
   - Respeta las reglas de `CLAUDE.md` (el worktree contiene su propia copia).
6. **Commit**: no hagas commit salvo que las instrucciones lo pidan. Si lo piden, hazlo dentro del worktree.
7. **Reporte final** (en español, breve): nombre elegido, ruta `.trees/<nombre>`, rama, qué se hizo, y cómo retirarlo después (`git worktree remove .trees/<nombre>`).

Si `$ARGUMENTS` está vacío, pide al usuario las instrucciones antes de crear nada.
