# The Princess Bird

Tarayıcıda `index.html` dosyasını açın. İnternet bağlantısı ilk açılışta Phaser 3 kütüphanesinin yüklenmesi için gereklidir.

## Dört bölüm

1. **Güneşli Köy** — Yigo'nun izini sür
2. **Fısıltılı Orman** — Nehri aş, mektubu bul
3. **Ayaz Dağı** — Kayalıkları geç, altın tüyleri topla
4. **Yigo'nun Mutfak Kalesi** — Prenses Kuş'u kurtar

## Giriş

- `assets/cutscenes/intro.mp4` varsa video oynatılır; yoksa panorama kaydırması gösterilir.
- **ATLA** ile geçilebilir.

## Bitiş

- Yigo yenildikten sonra `assets/custom/wedding_princess.jpg` üç saniye gösterilir (yoksa yer tutucu kart).
- Ardından bitiş panoraması ve jenerik ekranı gelir.

## Kontroller

- `A/D` veya ok tuşları — yürü
- `W` / yukarı ok / boşluk — zıpla (çift zıplama ve duvar zıplaması desteklenir)
- `Shift+Space` veya boss'ta boşluk — saldır
- `F` / `Q` — ay balığı fırlat
- `E` — yakındaki NPC ile konuş
- `ESC` / `P` — duraklat

## Kişisel görseller

| Dosya | Açıklama |
|---|---|
| `assets/custom/wedding_princess.jpg` | Bitişte gösterilen kişisel fotoğraf |
| `assets/cutscenes/intro.mp4` | Giriş videosu (opsiyonel) |
| `assets/cutscenes/intro_panorama.png` | Giriş panoraması (video yoksa) |
| `assets/cutscenes/ending_panorama.png` | Bitiş panoraması |

Sprite sheet rehberi: [assets/sprites/README.md](assets/sprites/README.md)

Kayıtlar ve ayarlar tarayıcıda otomatik saklanır. `assets/custom/wedding_princess.jpg`
ve `assets/custom/ending_photo.jpg` dosyaları şu an boş yer tutuculardır; kişisel
fotoğraf kullanılacaksa geçerli bir JPG dosyasıyla değiştirilmeleri gerekir.
