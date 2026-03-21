import ExcelJS from 'exceljs';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { db } from '../../db';
import TelegramBot from 'node-telegram-bot-api';
import os from 'os';

export async function exportReportsToExcel(month: string, year: string): Promise<string> {
    const paddedMonth = month.padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01 00:00:00`;
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

    const res = await db.query(`
    SELECT r.id, r.title, r.content, r.created_at, r.report_type, u.first_name, u.last_name, u.username
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.status = 'submitted' AND r.created_at >= $1 AND r.created_at <= $2
    ORDER BY r.created_at ASC
  `, [startDate, endDate]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Báo cáo T${month}-${year}`);

    worksheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày giờ gửi', key: 'created_at', width: 20 },
        { header: 'Tên nhân viên', key: 'name', width: 25 },
        { header: 'Loại báo cáo', key: 'type', width: 20 },
        { header: 'Tiêu đề', key: 'title', width: 30 },
        { header: 'Nội dung báo cáo', key: 'content', width: 50 },
        { header: 'File đính kèm', key: 'files', width: 15 }
    ];

    for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i];
        const dateStr = new Date(row.created_at).toLocaleString('vi-VN');
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ');
        const nameStr = `${fullName} ${row.username ? `(@${row.username})` : ''}`.trim();
        const typeStr = row.report_type === 'project' ? 'Dự án' : 'Hằng ngày';

        // Get file count
        const filesRes = await db.query('SELECT COUNT(*) FROM report_attachments WHERE report_id = $1', [row.id]);
        const fileCount = parseInt(filesRes.rows[0].count);

        worksheet.addRow({
            stt: i + 1,
            created_at: dateStr,
            name: nameStr,
            type: typeStr,
            title: row.title || 'Không có tiêu đề',
            content: row.content || 'Không có nội dung',
            files: fileCount > 0 ? `${fileCount} file` : 'Không'
        });
    }

    // Format header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const filePath = path.join(os.tmpdir(), `BaoCao_T${month}_${year}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
}

export async function exportReportToZip(bot: TelegramBot, reportId: number): Promise<string | null> {
    const res = await db.query(`
    SELECT r.title, r.content, r.created_at, r.report_type, u.first_name, u.last_name, u.username
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = $1
  `, [reportId]);

    if (res.rows.length === 0) return null;

    const report = res.rows[0];
    const dateStr = new Date(report.created_at).toLocaleString('vi-VN').replace(/[:/]/g, '-');
    const fullName = [report.first_name, report.last_name].filter(Boolean).join(' ');
    const nameStr = `${fullName}_${report.username || ''}`.trim().replace(/\s+/g, '_');
    const typeStr = report.report_type === 'project' ? 'DỰ ÁN' : 'CÔNG VIỆC HẰNG NGÀY';

    const zipFilePath = path.join(os.tmpdir(), `BaoCao_${nameStr}_${dateStr}.zip`);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve(zipFilePath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        (async () => {
            try {
                // Add text content
                const textContent = `BÁO CÁO ${typeStr}\n\nNgười gửi: ${fullName} ${report.username ? `(@${report.username})` : ''}\nNgày gửi: ${new Date(report.created_at).toLocaleString('vi-VN')}\nTiêu đề: ${report.title || 'Không có tiêu đề'}\n\nNội dung:\n${report.content || 'Không có nội dung'}`;
                archive.append(textContent, { name: 'noidung.txt' });

                // Add files
                const filesRes = await db.query('SELECT file_id, file_type FROM report_attachments WHERE report_id = $1', [reportId]);

                for (let i = 0; i < filesRes.rows.length; i++) {
                    const file = filesRes.rows[i];
                    try {
                        const fileInfo = await bot.getFile(file.file_id);
                        const token = process.env.TELEGRAM_BOT_TOKEN;
                        const fileLink = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
                        const response = await fetch(fileLink);
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        let ext = file.file_type === 'photo' ? 'jpg' : 'bin';
                        if (fileInfo.file_path) {
                            const match = fileInfo.file_path.match(/\.([^.]+)$/);
                            if (match) ext = match[1];
                        }

                        archive.append(buffer, { name: `attachment_${i + 1}.${ext}` });
                    } catch (err) {
                        console.error(`Error downloading file ${file.file_id}:`, err);
                    }
                }

                await archive.finalize();
            } catch (err) {
                reject(err);
            }
        })();
    });
}
