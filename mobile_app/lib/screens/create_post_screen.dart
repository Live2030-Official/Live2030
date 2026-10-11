import '../localization/app_locale_service.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class CreatePostScreen extends StatefulWidget {
  final String initialType; // 'PHOTO' or 'VIDEO'
  const CreatePostScreen({super.key, this.initialType = 'PHOTO'});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  late String _selectedType;
  final TextEditingController _captionController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  File? _selectedFile;
  bool _isUploading = false;
  String _uploadStatus = '';

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialType;
  }

  @override
  void dispose() {
    _captionController.dispose();
    super.dispose();
  }

  Future<void> _pickMedia(ImageSource source) async {
    try {
      if (_selectedType == 'VIDEO') {
        final picked = await _picker.pickVideo(
          source: source,
          maxDuration: const Duration(minutes: 5),
        );
        if (picked != null) {
          setState(() {
            _selectedFile = File(picked.path);
          });
        }
      } else {
        final picked = await _picker.pickImage(
          source: source,
          imageQuality: 85,
        );
        if (picked != null) {
          setState(() {
            _selectedFile = File(picked.path);
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'Error picking media:'.tr} $e', style: GoogleFonts.plusJakartaSans())),
        );
      }
    }
  }

  void _showMediaPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Choose ${_selectedType == 'VIDEO' ? 'Video' : 'Photo'} Source',
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildSourceOption(
                    icon: Icons.photo_library_rounded,
                    label: 'Gallery'.tr,
                    color: LiveColors.accentPurple,
                    onTap: () {
                      Navigator.pop(ctx);
                      _pickMedia(ImageSource.gallery);
                    },
                  ),
                  _buildSourceOption(
                    icon: Icons.camera_alt_rounded,
                    label: 'Camera'.tr,
                    color: LiveColors.accentPink,
                    onTap: () {
                      Navigator.pop(ctx);
                      _pickMedia(ImageSource.camera);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSourceOption({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Future<void> _publishPost() async {
    final user = AuthService().currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please log in to publish a post.'.tr)),
      );
      return;
    }

    if (_selectedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${'Please select a'.tr} ${_selectedType == 'VIDEO' ? 'Video'.tr : 'Photo'.tr}')),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadStatus = 'Uploading media to AWS cloud...';
    });

    try {
      // 1. Upload to backend
      final isVideo = _selectedType == 'VIDEO';
      final uploadRes = await ApiService().uploadPostMedia(
        _selectedFile!.path,
        isVideo: isVideo,
      );

      if (uploadRes == null || uploadRes['url'] == null) {
        throw Exception('Failed to get public media URL from server');
      }

      final mediaUrl = uploadRes['url'] as String;

      setState(() {
        _uploadStatus = 'Publishing post to feed...';
      });

      // 2. Create post in database
      final post = await ApiService().createPost(
        authorId: user.id,
        type: _selectedType,
        caption: _captionController.text.trim(),
        mediaUrl: mediaUrl,
        thumbnailUrl: uploadRes['thumbnailUrl'] as String?,
      );

      if (post != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Text('${_selectedType == 'VIDEO' ? 'Video'.tr : 'Photo'.tr} ${'published successfully!'.tr}'),
              ],
            ),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.redAccent,
            content: Text('${'Publishing failed:'.tr} $e'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white70),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Create New Post'.tr,
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
            child: GestureDetector(
              onTap: _isUploading ? null : _publishPost,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LiveColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                ),
                alignment: Alignment.center,
                child: _isUploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        'Share',
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Segmented Type Selector
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: LiveColors.backgroundSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: LiveColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        if (_selectedType != 'PHOTO') {
                          setState(() {
                            _selectedType = 'PHOTO';
                            _selectedFile = null;
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          gradient: _selectedType == 'PHOTO' ? LiveColors.primaryGradient : null,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.photo_outlined,
                              size: 18,
                              color: _selectedType == 'PHOTO' ? Colors.white : LiveColors.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                'Photo Post'.tr,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                  color: _selectedType == 'PHOTO' ? Colors.white : LiveColors.textSecondary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        if (_selectedType != 'VIDEO') {
                          setState(() {
                            _selectedType = 'VIDEO';
                            _selectedFile = null;
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          gradient: _selectedType == 'VIDEO' ? LiveColors.primaryGradient : null,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.videocam_outlined,
                              size: 18,
                              color: _selectedType == 'VIDEO' ? Colors.white : LiveColors.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                'Video / Reel'.tr,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                  color: _selectedType == 'VIDEO' ? Colors.white : LiveColors.textSecondary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Media Picker Area
            GestureDetector(
              onTap: _showMediaPickerSheet,
              child: Container(
                width: double.infinity,
                height: 260,
                decoration: BoxDecoration(
                  color: LiveColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _selectedFile != null ? const Color(0xFF10B981) : LiveColors.border,
                    width: _selectedFile != null ? 1.5 : 1,
                  ),
                ),
                child: _selectedFile != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (_selectedType == 'PHOTO')
                              Image.file(_selectedFile!, fit: BoxFit.cover)
                            else
                              Container(
                                color: Colors.black87,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: LiveColors.accentPink.withValues(alpha: 0.2),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.play_arrow_rounded, color: LiveColors.accentPink, size: 48),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Video Selected',
                                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    const SizedBox(height: 4),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 20),
                                      child: Text(
                                        _selectedFile!.path.split(RegExp(r'[\\/]')).last,
                                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            Positioned(
                              top: 10,
                              right: 10,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                child: const Icon(Icons.edit, color: Colors.white, size: 18),
                              ),
                            ),
                          ],
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: LiveColors.accentPink.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _selectedType == 'VIDEO' ? Icons.video_call_rounded : Icons.add_photo_alternate_rounded,
                              color: LiveColors.accentPink,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Tap to Select ${_selectedType == 'VIDEO' ? 'Video' : 'Photo'}',
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Supports Camera or Gallery upload',
                            style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),

            const SizedBox(height: 18),

            // Caption Field
            Text(
              'Caption & Words'.tr,
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: LiveColors.backgroundInput,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: LiveColors.border),
              ),
              child: TextField(
                controller: _captionController,
                maxLines: 4,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Share what is happening right now... #live2030 #party'.tr,
                  hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Hashtag quick helpers
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ['#Live2030', '#StreamerLife', '#Party', '#Music', '#Dance', '#GoodVibes'].map((tag) {
                return GestureDetector(
                  onTap: () {
                    final current = _captionController.text;
                    _captionController.text = current.isEmpty ? '$tag ' : '$current $tag ';
                    _captionController.selection = TextSelection.fromPosition(
                      TextPosition(offset: _captionController.text.length),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: LiveColors.backgroundElevated,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: LiveColors.border),
                    ),
                    child: Text(
                      tag,
                      style: GoogleFonts.plusJakartaSans(color: const Color(0xFF06B6D4), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              }).toList(),
            ),

            if (_isUploading) ...[
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: LiveColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 2),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        _uploadStatus,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
