Cloudinary unsigned preset fix
Error: Upload preset must be whitelisted for unsigned uploads

Fix in Cloudinary console:
1. Go to Settings > Upload > Upload presets
2. Open preset: ml_default
3. Set Signing Mode = Unsigned (not Signed)
4. Save the preset
5. Also check Settings > Security > Allow delivery of PDF and ZIP files
