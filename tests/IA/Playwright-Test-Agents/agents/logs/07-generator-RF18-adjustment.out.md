Escribí los dos escenarios de la sección 4 (RF-18 Ajuste) en `tests/RF18-adjustment.spec.ts`. No ejecuté el archivo. Lo único que probé fue cada paso a mano en el navegador.

- **Motivo obligatorio de al menos 4 caracteres.** No escribe en el ledger.
- **Registrar un ajuste con motivo válido.** Escribe en el ledger, tiene `test.skip(!WRITES_ALLOWED, …)` y llama a `ledger.track(id)`. No anula el movimiento él mismo, así que lo anula el teardown. Los datos salen de `DATA.reasons.*`. Si falla en tu máquina, puede que el valor de `DATA` no coincida con lo que vi.

En el escenario 4.1 la aplicación no se comporta como dice el plan, y escribí las aserciones con lo que vi:

- **Motivo vacío.** No aparece "Un ajuste necesita un motivo antes de poder confirmarse.". Esa cadena existe en `es.json`, pero no la vi en pantalla, ni en la barra ni en el resumen. El botón "Confirmar" queda con `aria-disabled="true"`, y el test comprueba eso con `toBeDisabled()`.
- **Motivo 'ab'.** No sale "Al menos 4 caracteres.". Al salir del campo aparece "Escribe al menos 4 caracteres." y el campo queda con `aria-invalid`. El botón sigue bloqueado.
- **Motivo de 4 espacios.** Se recorta y sale "Este campo no puede quedar vacío.". El botón sigue bloqueado.
- **Cantidad 0.** Con 0 unidades no existe la barra ni el botón "Confirmar". Así queda cubierto el caso de cantidad inválida.
- **Motivo válido.** Con "Rotura de botella" el botón se habilita. No miré la transición de `aria-disabled` en el DOM. Lo que sí vi es que, con ese motivo, el botón dejó confirmar.

El escenario 4.2 lo confirmé en el navegador: toast, diálogo "¿Confirmar este ajuste?", detalle con "Motivo: Rotura de botella", "-1 unidad base" y "-1 botella", y existencia de "1942" de 65 a 64. El test toma el primer producto de `/stock` y compara contra su existencia previa, sin nombrarlo.

El toast "Movimiento registrado" no lo vi al explorar. Para cuando miré ya había desaparecido, así que esa aserción viene del patrón de RF-16 y no de mi exploración.

El movimiento MOV-2026-000698 que creé al explorar lo anulé desde su detalle, y la existencia vuelve a 65.
