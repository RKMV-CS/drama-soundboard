; Per-user installer for Drama Soundboard (no admin rights).
; Normally run through scripts/build-installer.js. Manual form:
;   makensis /DVERSION=0.9.0 /DSOURCE_EXE=<built exe> /DOUTFILE=<output exe> scripts\installer.nsi
; Silent install / uninstall: Setup.exe /S [/D=<install dir, last, unquoted>]  and  Uninstall.exe /S

!ifndef VERSION
  !error "VERSION not defined (use /DVERSION=x.y.z)"
!endif
!ifndef SOURCE_EXE
  !error "SOURCE_EXE not defined (use /DSOURCE_EXE=<path>)"
!endif
!ifndef OUTFILE
  !error "OUTFILE not defined (use /DOUTFILE=<path>)"
!endif

!define APPNAME    "Drama Soundboard"
!define EXENAME    "Drama Soundboard.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\DramaSoundboard"
; VIProductVersion needs four numeric parts.
!define VIVERSION  "${VERSION}.0"

RequestExecutionLevel user
SetCompressor /SOLID lzma
Name "${APPNAME} ${VERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
; Re-install/upgrade reuses the previous location (value written below).
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
ShowInstDetails show
ShowUninstDetails show

VIProductVersion "${VIVERSION}"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${APPNAME}"
VIAddVersionKey "FileDescription" "${APPNAME} Installer"
VIAddVersionKey "LegalCopyright" "${APPNAME}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!insertmacro GetSize

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "!${APPNAME}" SecMain
  SectionIn RO
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  ; Fails with a Retry/Cancel prompt if the app is still running and the exe is locked.
  File "/oname=${EXENAME}" "${SOURCE_EXE}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortCut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\${EXENAME}"

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${APPNAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXENAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" $0
SectionEnd

Section "Desktop shortcut" SecDesktop
  SetShellVarContext current
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXENAME}"
SectionEnd

LangString DESC_SecMain ${LANG_ENGLISH} "The application and Start Menu shortcut."
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create a shortcut on the desktop."
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; User data in %APPDATA%\Drama Soundboard is intentionally left alone.
Section "un.${APPNAME}"
  SetShellVarContext current
  ; /REBOOTOK: if the app is still running, the file is removed at the next reboot instead of failing.
  Delete /REBOOTOK "$INSTDIR\${EXENAME}"
  Delete /REBOOTOK "$INSTDIR\Uninstall.exe"
  RMDir /REBOOTOK "$INSTDIR"

  Delete "$SMPROGRAMS\${APPNAME}.lnk"
  Delete "$DESKTOP\${APPNAME}.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"

  DetailPrint "Your data was kept in $APPDATA\${APPNAME} (delete that folder manually to remove it)."
SectionEnd
