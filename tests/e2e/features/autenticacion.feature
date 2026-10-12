@web @smoke
Feature: Autenticación
  Como encargada de bodega
  Quiero entrar con mi cuenta
  Para registrar y consultar el inventario

  Scenario: Inicio de sesión correcto
    When Camila inicia sesión con su cuenta
    Then ella llega a la ruta "/dashboard"

  Scenario: Credenciales inválidas
    When Camila inicia sesión con correo "nadie@beverage-ledger.test" y contraseña "no-es-la-clave"
    Then ella ve el aviso "Invalid email or password"
    And ella sigue en la ruta "/login"
