Get-ChildItem .\public\oriented -File |
Where-Object {
    $_.Name -match 'TEMP|RIGTH|SENRIGHT|CHA|NVZ|SPI|ALG'
} |
Select-Object -ExpandProperty Name



