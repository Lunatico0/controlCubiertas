; ============================================================================
; installer.nsh  —  Hooks NSIS custom para el instalador de TireOps
; (electron-builder lo incluye via  build.nsis.include)
; ----------------------------------------------------------------------------
; MIGRACION  "Control Cubiertas"  ->  "TireOps"
;
; El producto se rebrandeo de "Control Cubiertas" a "TireOps" y con eso cambio
; el appId:
;     viejo:  com.controlcubiertas.app   (productName "Control Cubiertas")
;     nuevo:  com.tireops.app            (productName "TireOps")
;
; electron-builder deriva el GUID de la clave de desinstalacion aplicando UUID v5
; sobre el appId. Como el appId cambio, el GUID tambien cambio, por lo que TireOps
; se instalaria AL LADO del viejo y el usuario terminaria con DOS aplicaciones
; ("Control Cubiertas" y "TireOps") en Programas y caracteristicas.
;
; El GUID de desinstalacion del install viejo (UUID v5 de com.controlcubiertas.app)
; es:  1f22099a-7290-5431-8a32-e7eca14893ab
;
; Este macro `customInit` (se ejecuta en .onInit del instalador nuevo) detecta el
; install viejo y lo desinstala en silencio ANTES de instalar TireOps, dejando una
; sola app instalada.
; ============================================================================

; --- Constantes de la app vieja ---------------------------------------------
!define OLD_GUID          "1f22099a-7290-5431-8a32-e7eca14893ab"
!define OLD_UNINST_ROOT   "Software\Microsoft\Windows\CurrentVersion\Uninstall"
!define OLD_UNINST_KEY    "${OLD_UNINST_ROOT}\${OLD_GUID}"
!define OLD_DISPLAY_NAME  "Control Cubiertas"

!macro customInit
  ; Preservamos los registros que usamos (customInit corre dentro de .onInit).
  Push $R1   ; UninstallString del viejo (ruta al "Uninstall ....exe")
  Push $R2   ; InstallLocation del viejo (carpeta de instalacion)
  Push $R3   ; scratch (quote-strip / char comparado)
  Push $R4   ; indice / nombre de subclave en la enumeracion por DisplayName
  Push $R5   ; DisplayName leido en la enumeracion

  StrCpy $R1 ""
  StrCpy $R2 ""

  ; ==========================================================================
  ; Vista de registro 64-bit: las apps de electron-builder x64 (vieja y nueva)
  ; registran su desinstalador en la vista de 64 bits.
  ; ==========================================================================
  SetRegView 64

  ; (a) Por GUID en HKLM (instalacion perMachine).
  ReadRegStr $R1 HKLM "${OLD_UNINST_KEY}" "UninstallString"
  ReadRegStr $R2 HKLM "${OLD_UNINST_KEY}" "InstallLocation"
  StrCmp $R1 "" 0 tireops_found

  ; (b) Por GUID en HKCU (instalacion perUser).
  ReadRegStr $R1 HKCU "${OLD_UNINST_KEY}" "UninstallString"
  ReadRegStr $R2 HKCU "${OLD_UNINST_KEY}" "InstallLocation"
  StrCmp $R1 "" 0 tireops_found

  ; (c) Fallback robusto: recorrer las subclaves de Uninstall en HKLM buscando
  ;     DisplayName == "Control Cubiertas" (cubre GUIDs distintos por reinstalls).
  StrCpy $R4 0
  tireops_enum_hklm:
    EnumRegKey $R3 HKLM "${OLD_UNINST_ROOT}" $R4
    StrCmp $R3 "" tireops_enum_hkcu_init
    IntOp $R4 $R4 + 1
    ReadRegStr $R5 HKLM "${OLD_UNINST_ROOT}\$R3" "DisplayName"
    StrCmp $R5 "${OLD_DISPLAY_NAME}" 0 tireops_enum_hklm
      ReadRegStr $R1 HKLM "${OLD_UNINST_ROOT}\$R3" "UninstallString"
      ReadRegStr $R2 HKLM "${OLD_UNINST_ROOT}\$R3" "InstallLocation"
      StrCmp $R1 "" tireops_enum_hklm tireops_found

  ; (d) Fallback por DisplayName en HKCU.
  tireops_enum_hkcu_init:
  StrCpy $R4 0
  tireops_enum_hkcu:
    EnumRegKey $R3 HKCU "${OLD_UNINST_ROOT}" $R4
    StrCmp $R3 "" tireops_try32
    IntOp $R4 $R4 + 1
    ReadRegStr $R5 HKCU "${OLD_UNINST_ROOT}\$R3" "DisplayName"
    StrCmp $R5 "${OLD_DISPLAY_NAME}" 0 tireops_enum_hkcu
      ReadRegStr $R1 HKCU "${OLD_UNINST_ROOT}\$R3" "UninstallString"
      ReadRegStr $R2 HKCU "${OLD_UNINST_ROOT}\$R3" "InstallLocation"
      StrCmp $R1 "" tireops_enum_hkcu tireops_found

  ; (e) Ultimo fallback: vista de registro 32-bit por GUID (install legacy 32-bit).
  tireops_try32:
  SetRegView 32
  ReadRegStr $R1 HKLM "${OLD_UNINST_KEY}" "UninstallString"
  ReadRegStr $R2 HKLM "${OLD_UNINST_KEY}" "InstallLocation"
  StrCmp $R1 "" 0 tireops_found
  ReadRegStr $R1 HKCU "${OLD_UNINST_KEY}" "UninstallString"
  ReadRegStr $R2 HKCU "${OLD_UNINST_KEY}" "InstallLocation"
  StrCmp $R1 "" tireops_skip tireops_found

  ; ==========================================================================
  ; Encontramos un install viejo -> preparar rutas y desinstalar.
  ; ==========================================================================
  tireops_found:
    ; -- Quitar comillas envolventes del UninstallString ($R1 = "ruta\Uninstall X.exe") --
    StrCpy $R3 $R1 1
    StrCmp $R3 '"' 0 tireops_noquote
      StrCpy $R1 $R1 "" 1        ; saca la comilla inicial
      StrCpy $R3 $R1 "" -1       ; ultimo caracter
      StrCmp $R3 '"' 0 tireops_noquote
        StrCpy $R1 $R1 -1        ; saca la comilla final
    tireops_noquote:

    ; -- Si no tenemos carpeta, corremos sin _?= (async, sin espera garantizada) --
    StrCmp $R2 "" tireops_run_nodir

    ; -- Quitar comillas envolventes del InstallLocation si las trae --
    StrCpy $R3 $R2 1
    StrCmp $R3 '"' 0 tireops_havedir
      StrCpy $R2 $R2 "" 1
      StrCpy $R3 $R2 "" -1
      StrCmp $R3 '"' 0 tireops_havedir
        StrCpy $R2 $R2 -1
    tireops_havedir:

    ; -- Desinstalar en silencio y ESPERAR.
    ;    _?=<dir> hace que el uninstaller de electron-builder corra sincronico
    ;    (sin _?= se copia a %TEMP% y ExecWait retornaria de inmediato). --
    ExecWait '"$R1" /S _?=$R2'
    ; Con _?= el uninstaller NO se borra solo: limpiamos el remanente.
    Delete "$R1"
    RMDir "$R2"          ; solo borra la carpeta si quedo vacia (no recursivo, seguro)
    Goto tireops_done

  tireops_run_nodir:
    ExecWait '"$R1" /S'
    Goto tireops_done

  tireops_skip:
  tireops_done:
    SetRegView 64        ; restauramos la vista de 64-bit para el resto del install

  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
!macroend
