(cd src && dotnet publish -c Release -o publish)
(cd src/publish && zip -r ../../function.zip .)
