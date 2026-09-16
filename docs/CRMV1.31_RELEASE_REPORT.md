# CRMV1.31 Release Report

- Version: 3.8.43
- Build: crmv1.31
- Release: v3.8.43-crmv1.31-install-contract-hotfix
- Base: crmv1.30

## Düzeltilen kritik kurulum hatası

crmv1.30 paketinde bazı eski sözleşme testleri hâlâ v3.8.41 / crmv1.29 release kimliğini bekliyordu. `scripts/static-check.sh` kurulum sırasında bu testleri çalıştırdığı için yeni 3.8.42 / crmv1.30 kaynak kodu doğru olmasına rağmen aktivasyon duruyor ve rollback mekanizması crmv1.29'u yeniden aktif ediyordu.

crmv1.31 içinde eski release beklentileri güncellendi. Ayrıca `test-crmv1-31-install-contract-hotfix.js` ile paket sürümü, BUILD_INFO, config, install, update-live ve health-check kimliklerinin birbirleriyle uyumlu olduğu ve eski release beklentilerinin testlerde kalmadığı doğrulanır.
